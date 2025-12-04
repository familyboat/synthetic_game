import { Application } from "pixi.js";
import { Ground } from "./ground";
import { BallManager, type BallUserData } from "./ball";
import { Wall } from "./wall";
import {
  b2CreateWorld,
  b2CreateWorldArray,
  b2DefaultWorldDef,
  b2Shape_GetBody,
  b2Shape_GetUserData,
  b2ShapeId,
  b2Vec2,
  b2World_GetContactEvents,
  b2World_Step,
} from "phaser-box2d";

export async function runSyntheticBallGame() {
  b2CreateWorldArray();
  const worldDef = b2DefaultWorldDef();
  worldDef.gravity = new b2Vec2(0, 9.81);
  const worldId = b2CreateWorld(worldDef);

  const app = new Application();
  await app.init({
    hello: true,
    resizeTo: window,
    resolution: window.devicePixelRatio,
    backgroundAlpha: 0,
    autoDensity: true,
  });

  document.body.appendChild(app.canvas);

  const ground = new Ground(app.screen, worldId, app.stage);
  ground.init();

  const leftWall = new Wall(app.screen, worldId, app.stage, 0, 0);
  leftWall.init();

  const rightWall = new Wall(
    app.screen,
    worldId,
    app.stage,
    app.screen.width - 20,
    0,
  );
  rightWall.init();

  function makeBall() {
    BallManager.makeNewBall(app.screen, worldId, app.stage);
  }

  setInterval(() => {
    makeBall();
  }, 1000);

  app.ticker.add(() => {
    b2World_Step(worldId, 1 / 60, 2);

    const contactEvents = b2World_GetContactEvents(worldId);
    for (const event of contactEvents.beginEvents) {
      const aUserData = b2Shape_GetUserData(
        event.shapeIdA,
      ) as unknown as BallUserData;
      const bUserData = b2Shape_GetUserData(
        event.shapeIdB,
      ) as unknown as BallUserData;

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
    }

    BallManager.update();
    ground.update();
  });
}
