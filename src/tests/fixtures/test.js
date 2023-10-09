import * as Turbo from "@hotwired/turbo";
import { Application } from "@hotwired/stimulus";
import VirtualizedController from "../../controllers/virtualized_controller";

window.Turbo = Turbo;
Turbo.start();

window.Stimulus = Application.start();
Stimulus.register("virtualized", VirtualizedController);
