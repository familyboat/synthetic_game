import RAPIER, { EventQueue } from "@dimforge/rapier2d-compat";
import { Application } from "pixi.js";
import { Ground } from "./ground";
import { BallManager } from "./ball";
import { Wall } from "./wall";

export async function runSyntheticBallGame() {
  const gravity = { x: 0.0, y: 9.81 };
  const world = new RAPIER.World(gravity);
  const eventqueue = new EventQueue(true);

  const app = new Application();
  await app.init({
    hello: true,
    resizeTo: window,
    resolution: window.devicePixelRatio,
    backgroundAlpha: 0,
    autoDensity: true,
  });

  document.body.appendChild(app.canvas);

  const ground = new Ground(app.screen, world, app.stage);
  ground.init();

  const leftWall = new Wall(app.screen, world, app.stage, 0, 0);
  leftWall.init();

  const rightWall = new Wall(
    app.screen,
    world,
    app.stage,
    app.screen.width - 20,
    0,
  );
  rightWall.init();

  function makeBall() {
    BallManager.makeNewBall(app.screen, world, app.stage);
  }

  setInterval(() => {
    makeBall();
  }, 1000);

  app.ticker.add(() => {
    world.step(eventqueue);
    eventqueue.drainCollisionEvents((handle1, handle2) => {
      const aCollider = world.getCollider(handle1);
      const bCollider = world.getCollider(handle2);
      const aUserData = aCollider?.data;
      const bUserData = bCollider?.data;
      if (aUserData?.isBall && bUserData?.isBall) {
        const aBall = BallManager.getBall(aUserData.uuid);
        const bBall = BallManager.getBall(bUserData.uuid);

        if (
          aBall &&
          bBall &&
          aBall.isActive &&
          bBall.isActive &&
          aBall.canSynthetic(bBall)
        ) {
          aBall.makeDead();
          bBall.makeDead();

          aBall.translate(bBall);
        }
      }
    });

    BallManager.update();
    ground.update();
  });
}
