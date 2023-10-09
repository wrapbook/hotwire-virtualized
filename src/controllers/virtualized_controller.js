import { Controller } from "@hotwired/stimulus";
import { Turbo } from "@hotwired/turbo-rails";
import { throttle } from "../utils/throttle";

export default class extends Controller {
  static values = {
    ids: { type: Array, default: [] },
    url: { type: String },
    rowHeight: { type: Number },
    height: { type: String },
    pageSize: { type: Number, default: 50 },
    renderAhead: { type: Number, default: 10 },
    debug: { type: Boolean, default: false },
  };

  static targets = ["viewport", "content", "placeholder"];

  connect() {
    this.rowCache = new Map(); // Could be LRU cache
    this.rowIds = this.idsValue.map((id) => id.toString());
    this.missingIds = new Set();
    this.loadingIds = {};
    this.prevStartNode = 0;
    this.currentFetches = 0;
    this.rendering = false;

    this.boundEvents = [];
    this.bindEvent(this.element, "scroll", this.onScroll);
    this.bindEvent(window, "turbo:before-stream-render", this.streamRender);
    this.bindEvent(window, "resize", this.requestRender);
    this.throttledLoadMissing = throttle(this.loadMissing, 200, this);

    this.styleTargets();
    this.requestRender();
  }

  bindEvent(object, event, func) {
    const boundFunc = func.bind(this);
    object.addEventListener(event, boundFunc);
    this.boundEvents.push(object, event, boundFunc);
  }

  disconnect() {
    this.boundEvents.forEach(([object, event, boundFunc]) => {
      object.removeEventListener(event, boundFunc);
    });
  }

  styleTargets() {
    this.element.style.height = `${this.height}px`;
    this.element.style.overflow = "auto";

    this.viewportTarget.style.position = "relative";
    this.viewportTarget.style.height = `${
      this.rowIds.length * this.rowHeightValue
    }px`;
    this.viewportTarget.style.overflow = "hidden";
    this.viewportTarget.style.willChange = "transform";

    this.contentTarget.style.willChange = "transform";
    this.contentTarget.style.transform = "translateY(0px)";
  }

  onScroll() {
    this.requestRender();
  }

  get height() {
    const value = this.heightValue;

    if (value.includes("vh")) {
      return (window.innerHeight * parseInt(value)) / 100;
    } else if (value.includes("px")) {
      return parseInt(value);
    } else {
      return window.innerHeight;
    }
  }

  requestRender() {
    this.requireRender = true;
    if (this.rendering) return;

    this.rendering = true;
    this.requireRender = false;

    requestAnimationFrame(() => {
      const start = performance.now();
      this.render();
      const end = performance.now();
      if (this.debugValue && false)
        console.log(`Time Rendering: ${end - start} ms`);
      this.rendering = false;
      if (this.requireRender) this.requestRender();
    });
  }

  render() {
    const scrollTop = this.element.scrollTop;
    let startNode =
      Math.floor(scrollTop / this.rowHeightValue) - this.renderAheadValue;
    startNode = Math.max(0, startNode);

    let visibleNodeCount =
      Math.ceil(this.height / this.rowHeightValue) + 2 * this.renderAheadValue;
    visibleNodeCount = Math.min(
      this.rowIds.length - startNode,
      visibleNodeCount
    );
    const offsetY = startNode * this.rowHeightValue;

    this.contentTarget.style.transform = `translateY(${offsetY}px)`;

    this.startNode = startNode;
    this.stopNode = startNode + visibleNodeCount;
    this.updateContent();
  }

  updateContent() {
    const { rows, missingIds } = this.fetchRows(this.startNode, this.stopNode);
    this.applyDrift(rows);
    this.prevStartNode = this.startNode;

    if (rows.length === this.contentTarget.children.length) {
      rows.forEach((row, index) => {
        if (!this.contentTarget.children[index]) {
          // don't understand this one
          this.contentTarget.appendChild(row);
        } else if (!row.isSameNode(this.contentTarget.children[index])) {
          this.contentTarget.replaceChild(
            row,
            this.contentTarget.children[index]
          );
        }
      });
    } else {
      this.contentTarget.replaceChildren(...rows);
    }

    this.missingIds = new Set([...missingIds, ...this.missingIds]);
    if (this.missingIds.size > 0) {
      this.throttledLoadMissing();
    }
  }

  applyDrift(rows) {
    const drift = this.startNode - this.prevStartNode;

    if (drift === 0 || Math.abs(drift) > rows.length) return;

    if (drift > 0) {
      for (let i = 1; i <= drift; i++) {
        this.contentTarget.append(rows.at(-1 * i));
        this.contentTarget.firstChild.remove();
      }
    } else if (drift < 0) {
      for (let i = 0; i < Math.abs(drift); i++) {
        this.contentTarget.prepend(rows.at(i));
        this.contentTarget.lastChild.remove();
      }
    }
  }

  fetchRows(start, stop) {
    const ids = this.rowIds.slice(start, stop);
    const rows = ids.map((id) => this.rowCache.get(id) || this.createRow(id));

    // Loading with paged IDs to limit number of server fetches
    const loadStart =
      Math.floor(start / this.pageSizeValue) * this.pageSizeValue;
    const loadStop = Math.ceil(stop / this.pageSizeValue) * this.pageSizeValue;
    const loadIds = this.rowIds.slice(loadStart, loadStop);
    const missingIds = loadIds.filter((id) => !this.rowCache.has(id));

    return { rows, missingIds };
  }

  createRow(_id) {
    const clone = this.placeholderTarget.content.cloneNode(true);
    return clone.firstElementChild;
  }

  loadMissing() {
    const missingIds = [...this.missingIds].filter(
      (id) => !this.loadingIds[id]
    );
    const ids = missingIds.splice(0, this.pageSizeValue);
    this.missingIds = new Set(missingIds);
    if (ids.length === 0) return;

    this.loadRecords(ids);

    if (this.missingIds.size > 0) {
      // Trim size of missingIds to the top (most recently requested)
      if (this.missingIds.size > this.pageSizeValue * 2) {
        const topMissingIds = Array.from(this.missingIds).slice(
          0,
          this.pageSizeValue * 2
        );
        this.missingIds = new Set(topMissingIds);
      }

      this.throttledLoadMissing();
    }
  }

  get baseUrl() {
    return `${window.location.protocol}//${window.location.host}`;
  }

  urlFor(ids) {
    const url = new URL(this.urlValue, this.baseUrl);
    ids.forEach((id) => {
      url.searchParams.append("q[id_in][]", id);
    });
    return url;
  }

  async loadRecords(ids) {
    try {
      if (this.debugValue) console.log(`Loading: ${ids.join(",")}`);
      this.currentFetches++;
      ids.forEach((id) => (this.loadingIds[id] = true));
      const response = await fetch(this.urlFor(ids));
      const html = await response.text();
      Turbo.renderStreamMessage(html);
    } finally {
      this.currentFetches--;
      ids.forEach((id) => delete this.loadingIds[id]);
    }
  }

  streamRender(event) {
    const fallbackToDefaultActions = event.detail.render;

    event.detail.render = (streamElement) => {
      switch (streamElement.action) {
        case "virtualized-replace":
          return this.virtualizedReplace(streamElement);
        case "virtualized-remove":
          return this.virtualizedRemove(streamElement);
        case "virtualized-append":
          return this.virtualizedAppend(streamElement);
        default:
          return fallbackToDefaultActions(streamElement);
      }
    };
  }

  virtualizedReplace(streamElement) {
    const target = streamElement.target;
    const element = streamElement.templateContent.firstElementChild;
    const rowId = streamElement.getAttribute("row-id");
    const replaceTarget = rowId && target !== rowId;

    // When a row is added on the client side, it is given a temporary rowId.
    // When that record is persisted, it may want to replace the temp rowId
    // with a permanent ID (e.g. from the database). By setting the row-id attribute,
    // it will be used in the rowIds array and the rowCache going forward.

    if (replaceTarget) {
      const index = this.rowIds.indexOf(target);
      if (index >= 0) {
        this.rowIds[index] = rowId;
      }
      this.rowCache.delete(target);
      this.rowCache.set(rowId, element);
    } else {
      this.rowCache.set(target, element);
    }
    this.requestRender();
  }

  virtualizedAppend(streamElement) {
    const target = streamElement.target;
    const element = streamElement.templateContent.firstElementChild;
    this.rowCache.set(target, element);
    this.rowIds.push(target);
  }

  virtualizedRemove(streamElement) {
    const target = streamElement.target;
    const index = this.rowIds.indexOf(target);
    this.rowCache.delete(target);
    if (index >= 0) {
      this.rowIds.splice(index, 1); // remove id from rowIds
    }
    this.requestRender();
  }

  newRowAdded(event) {
    const {
      detail: { newRow },
    } = event;
    const newIndex = this.rowIds.indexOf(event.target.dataset.id) + 1;
    const newRowId = newRow.getAttribute("id");

    this.rowIds.splice(newIndex, 0, newRowId);
    this.rowCache.set(newRowId.toString(), newRow);
    this.requestRender();
  }
}
