import * as Turbo from "@hotwired/turbo";
import { Application } from "@hotwired/stimulus";
import VirtualizedController from "../../controllers/virtualized_controller";
import TestIdController from "./controllers/test_id_controller";
import EventController from "./controllers/event_controller";

window.Turbo = Turbo;
Turbo.start();

window.Stimulus = Application.start();
Stimulus.register("virtualized", VirtualizedController);

// Testing Controllers
Stimulus.register("testId", TestIdController);
Stimulus.register("event", EventController);
