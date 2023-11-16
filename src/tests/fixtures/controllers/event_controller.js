import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  prepend() {
    const { id, element } = this.buildElement();
    this.dispatch("emit", { detail: { id, element, action: "prepend" } });
  }

  append() {
    const { id, element } = this.buildElement();
    this.dispatch("emit", { detail: { id, element, action: "append" } });
  }

  buildElement() {
    const id = Date.now();
    const element = document.createElement("li");
    element.innerHTML = `
      <div class="flex">
        <span>ID ${id}</span>
        <form action="/items/${id}?_method=delete" method="post">
          <button type="submit">Delete</button>
        </form>
      </div>
    `;
    return { id, element };
  }
}
