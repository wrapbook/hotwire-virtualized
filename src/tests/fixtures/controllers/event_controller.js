import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  prepend() {
    const { id, element } = this.buildElement();
    this.dispatch("emit", {
      detail: { id, element, action: "prepend", scrollTo: true },
    });
  }

  append() {
    const { id, element } = this.buildElement();
    this.dispatch("emit", {
      detail: { id, element, action: "append", scrollTo: true },
    });
  }

  buildElement() {
    const id = Date.now();
    const element = document.createElement("li");
    element.innerHTML = `
      <span>ID ${id}</span>
      <div class="flex">
        <form action="/items/${id}?_method=put" method="post">
          <button type="submit">Update</button>
        </form>
        <form action="/items/${id}?_method=delete" method="post">
          <button type="submit">Delete</button>
        </form>
      </div>
    `;
    return { id, element };
  }
}
