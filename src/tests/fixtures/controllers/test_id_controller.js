import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  refresh(event) {
    event.target.setAttribute("data-virtualized-id-param", Date.now());
  }
}
