import { Controller } from "@hotwired/stimulus";
import { Turbo } from "@hotwired/turbo-rails";
import { throttle } from "../utils/throttle";

export default class extends Controller {
  static values = {
    ids: { type: Array, default: [] },
    url: { type: String },
    rowHeight: { type: Number },
    pageSize: { type: Number, default: 50 },
    renderAhead: { type: Number, default: 10 },
    debug: { type: Boolean, default: false },
    virtualizedId: { type: String, default: "virtualized" },
    heightMode: { type: String, default: "fixed" },
  };

  static targets = ["content", "placeholder", "preloaded"];

  connect() {
    this.rowCache = new Map(); // Could be LRU cache
    this.rowIds = this.idsValue.map((id) => id.toString());
    this.missingIds = new Set();
    this.loadingIds = {};
    this.prevStartNode = 0;
    this.currentFetches = 0;
    this.rendering = false;

    // Variable heights
    this.variableTotal = 0;
    this.variableRowHeights = [];
    this.variableCumulativeHeights = [];

    this.prepareDOM();

    this.boundEvents = [];
    this.bindEvent(this.container, "scroll", this.onScroll);
    this.bindEvent(window, "turbo:before-stream-render", this.streamRender);
    this.bindEvent(window, "resize", this.requestRender);
    this.throttledLoadMissing = throttle(this.loadMissing, 200, this);

    this.parsePreloaded();
    if (this.heightModeValue === "variable") this.initVariableHeights();
    this.restoreScrollPosition();
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

  prepareDOM() {
    // Height based off of contentParentNode
    this.contentParentNode = this.contentTarget.parentNode;

    if (this.height === 0) {
      console.warn(
        "Ensure viewport's parent element has a specified height.",
        this.contentParentNode
      );
    }

    // Create Container Element
    this.container = document.createElement("div");
    this.container.style.height = `${this.height}px`;
    this.container.style.overflow = "auto";

    // Create Viewport Element
    this.viewport = document.createElement("div");
    this.viewport.style.position = "relative";
    this.updateViewportHeight();
    this.viewport.style.overflow = "hidden";
    this.viewport.style.willChange = "transform";

    // Style Content Target
    this.contentTarget.style.willChange = "transform";
    this.contentTarget.style.transform = "translateY(0px)";

    // Insert Elements
    this.contentParentNode.insertBefore(this.container, this.contentTarget);
    this.container.appendChild(this.viewport);
    this.viewport.appendChild(this.contentTarget);
  }

  parsePreloaded() {
    this.preloadedTargets.forEach((template) => {
      const rowId = template.getAttribute("data-preloaded-id");
      if (rowId) {
        const element = template.content.firstElementChild;
        this.rowCache.set(rowId, element);
      }
      template.remove();
    });
  }

  updateViewportHeight() {
    if (this.heightModeValue === "variable") {
      this.viewport.style.height = `${this.variableTotalHeight}px`;
    } else {
      const fixedTotalHeight = this.rowIds.length * this.rowHeightValue;
      this.viewport.style.height = `${fixedTotalHeight}px`;
    }
  }

  onScroll() {
    this.requestRender();
  }

  get height() {
    return this.contentParentNode.clientHeight;
  }

  initVariableHeights() {
    // todo: when init
    // request load of all missing rows

    // todo: when rows have changed
    const rowHeights = [];
    this.rowIds.forEach((id) => {
      let elementHeight = 0;
      const element = this.rowCache.get(id);

      if (element) {
        const dupe = element.cloneNode(true);
        this.contentTarget.appendChild(dupe);
        elementHeight = dupe.clientHeight;
        dupe.remove();
      }

      rowHeights.push(elementHeight);
    });
    this.variableRowHeights = rowHeights;
    this.updateCumulativeHeights();
  }

  updateCumulativeHeights() {
    let totalHeight = 0;
    const cumulativeHeights = [];

    this.variableRowHeights.forEach((height) => {
      cumulativeHeights.push(totalHeight);
      totalHeight += height;
    });

    this.variableTotalHeight = totalHeight;
    this.variableCumulativeHeights = cumulativeHeights;

    if (this.debugValue) {
      console.log("updateCumulativeHeights", {
        totalHeight: this.variableTotalHeight,
        rowHeights: [...this.variableRowHeights],
        cumulativeHeights: [...this.variableCumulativeHeights],
      });
    }
  }

  requestRender() {
    this.requireRender = true;
    if (this.rendering) return;

    this.rendering = true;
    this.requireRender = false;

    requestAnimationFrame(() => {
      // const start = performance.now();
      this.render();
      // const end = performance.now();
      // if (this.debugValue) console.log(`Time Rendering: ${end - start} ms`);
      this.rendering = false;
      if (this.requireRender) this.requestRender();
    });
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const startNode = this.calcStartNode(scrollTop);

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
    this.storeScrollPosition(scrollTop);
  }

  calcStartNode(scrollTop) {
    let index;

    if (this.heightModeValue === "variable") {
      // todo: binary search to limit number of iterations
      index = this.variableCumulativeHeights.findIndex(
        (height) => height >= scrollTop
      );
    } else {
      index = Math.floor(scrollTop / this.rowHeightValue);
    }

    return Math.max(0, index - this.renderAheadValue);
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
      const response = await fetch(this.urlFor(ids), {
        headers: {
          // Accept: "text/vnd.turbo-stream.html",
          "X-Virtualized-Id": this.virtualizedIdValue,
        },
      });
      const html = await response.text();
      Turbo.renderStreamMessage(html);
    } finally {
      this.currentFetches--;
      ids.forEach((id) => delete this.loadingIds[id]);
    }
  }

  get positionKey() {
    return `${this.virtualizedIdValue}/position`;
  }

  storeScrollPosition(position) {
    if (!window.sessionStorage) return;

    window.sessionStorage.setItem(this.positionKey, position);
  }

  restoreScrollPosition() {
    if (!window.sessionStorage) return;

    const value = window.sessionStorage.getItem(this.positionKey);
    if (value === null) return;

    if (this.debugValue) console.log(`Restoring scroll position: ${value}`);

    this.container.scrollBy(0, parseInt(value, 10));
  }

  streamRender(event) {
    const fallbackToDefaultActions = event.detail.render;

    event.detail.render = (streamElement) => {
      const virtualizedId = streamElement.getAttribute("virtualized-id");

      // When virtualizedId mismatch we assume another instance will process
      if (virtualizedId && virtualizedId !== this.virtualizedIdValue) {
        return fallbackToDefaultActions(streamElement);
      }

      switch (streamElement.action) {
        case "v-replace":
          return this.streamReplace(streamElement);
        case "v-remove":
          return this.streamRemove(streamElement);
        case "v-prepend":
          return this.streamPrepend(streamElement);
        case "v-append":
          return this.streamAppend(streamElement);
        default:
          return fallbackToDefaultActions(streamElement);
      }
    };
  }

  eventRender(event) {
    const {
      detail: { id, element, action, targetId, virtualizedId },
    } = event;

    if (virtualizedId && virtualizedId !== this.virtualizedIdValue) return;

    if (action === "append") {
      this.insertRowId(this.rowIds.length, id, element);
    } else if (action === "prepend") {
      this.insertRowId(0, id, element);
    } else if (action === "after") {
      this.insertRowIdAfter(id, targetId, element);
    } else if (action === "before") {
      this.insertRowIdBefore(id, targetId, element);
    } else if (action === "replace") {
      this.replaceRow(id, element, targetId);
    } else if (action === "remove") {
      this.removeRow(id);
    } else {
      console.warn(`Unknown action: ${action}`);
    }
  }

  actionRender(event) {
    const { id, action, targetId, selector } = event.params;
    const element = selector ? document.querySelector(selector) : null;
    this.eventRender({ detail: { id, element, action, targetId } });
  }

  streamReplace(streamElement) {
    const rowId = streamElement.target;
    const element = streamElement.templateContent.firstElementChild;
    const newRowId = streamElement.getAttribute("row-id");
    const replaceTarget = newRowId && rowId !== newRowId;

    // When a row is added on the client side, it is given a temporary rowId.
    // When that record is persisted, it may want to replace the temp rowId
    // with a permanent ID (e.g. from the database). By setting the row-id attribute,
    // it will be used in the rowIds array and the rowCache going forward.

    this.replaceRow(rowId, element, replaceTarget ? newRowId : null);
  }

  streamPrepend(streamElement) {
    const rowId = streamElement.target;
    const element = streamElement.templateContent.firstElementChild;
    this.insertRowId(0, rowId, element);
  }

  streamAppend(streamElement) {
    const rowId = streamElement.target;
    const element = streamElement.templateContent.firstElementChild;
    this.insertRowId(this.rowIds.length, rowId, element);
  }

  streamRemove(streamElement) {
    const rowId = streamElement.target;
    this.removeRow(rowId);
  }

  replaceRow(rowId, element, newRowId) {
    if (newRowId) {
      const index = this.rowIds.indexOf(rowId);
      if (index >= 0) {
        this.rowIds[index] = newRowId;
      }
      this.rowCache.delete(rowId);
      this.rowCache.set(newRowId, element);
    } else {
      this.rowCache.set(rowId, element);
    }

    if (this.heightModeValue === "variable") {
      this.updateVariableHeight(newRowId || rowId, element);
    }

    this.requestRender();
  }

  removeRow(rowId) {
    const index = this.rowIds.indexOf(rowId);
    this.rowCache.delete(rowId);
    if (index >= 0) {
      this.rowIds.splice(index, 1); // remove id from rowIds
    }
    this.updateViewportHeight();
    this.requestRender();
  }

  insertRowIdBefore(rowId, targetId, element = null) {
    const index = this.rowIds.indexOf(targetId.toString());
    if (index < 0) return;

    this.insertRowId(index, rowId, element);
  }

  insertRowIdAfter(rowId, targetId, element = null) {
    const index = this.rowIds.indexOf(targetId.toString());
    if (index < 0) return;

    this.insertRowId(index + 1, rowId, element);
  }

  insertRowId(index, rowId, element = null) {
    rowId = rowId.toString();

    if (!this.rowIds.includes(rowId)) {
      this.rowIds.splice(index, 0, rowId);
    }

    if (element) {
      this.rowCache.set(rowId, element);
      if (this.heightModeValue === "variable") {
        this.updateVariableHeight(rowId, element);
      }
    }

    this.updateViewportHeight();
    this.requestRender();
  }

  updateVariableHeight(rowId, element) {
    if (!element) return;

    const index = this.rowIds.indexOf(rowId);
    if (index < 0) return;

    // temporarily add it to DOM to get its height
    const dupe = element.cloneNode(true);
    this.contentTarget.appendChild(dupe);
    const elementHeight = dupe.clientHeight;
    dupe.remove();

    this.variableRowHeights[index] = elementHeight;
    this.updateCumulativeHeights();
  }
}
