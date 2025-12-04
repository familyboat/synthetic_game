import { Application } from "pixi.js";
import { Ground } from "./ground";
import { BallManager } from "./ball";
import { Wall } from "./wall";
import { Engine, Events } from "matter-js";

export async function runSyntheticBallGame() {
  const gravity = { x: 0.0, y: 9.81, scale: 0.00001 };
  const engine = Engine.create({
    gravity,
    enableSleeping: true,
  });
  const world = engine.world;

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

  Events.on(engine, "collisionActive", (event) => {
    const pairs = event.pairs;
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const aBody = pair.bodyA;
      const bBody = pair.bodyB;

      if (aBody.data?.isBall && bBody.data?.isBall) {
        const aBall = BallManager.getBall(aBody.data.uuid);
        const bBall = BallManager.getBall(bBody.data.uuid);

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
    }
  });

  app.ticker.add(() => {
    Engine.update(engine);

    BallManager.update();
    ground.update();
  });
}
