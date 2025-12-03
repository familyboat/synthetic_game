import RAPIER from "@dimforge/rapier2d-compat";
import { runSyntheticBallGame } from "./ball";
import "./style.css";

RAPIER.init().then(() => {
  runSyntheticBallGame();
});
