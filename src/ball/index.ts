import { Application } from "pixi.js";
import { Ground } from "./ground";
import { BallManager } from "./ball";
import { Wall } from "./wall";
import { ContactMaterial, Material, World } from "p2-es";
import { SAPBroadphase } from "p2-es";

export async function runSyntheticBallGame() {
  const ice = new Material()
  const iceContactMaterial = new ContactMaterial(ice, ice, {
    friction: 0,
    restitution: 0
  })  
  const gravity = [0.0, 9.81];
  const world = new World({
    gravity,
    broadphase: new SAPBroadphase()
  });
  world.defaultMaterial = ice
  world.defaultContactMaterial = iceContactMaterial

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

  world.on('beginContact', (e) => {
    const aShape = e.shapeA
    const bShape = e.shapeB
    const aUserData = aShape.data
    const bUserData = bShape.data

    if (aUserData?.isBall && bUserData?.isBall) {
      const aBall = BallManager.getBall(aUserData.uuid)
      const bBall = BallManager.getBall(bUserData.uuid)

      if (aBall && bBall && aBall.isActive && bBall.isActive && aBall.canSynthetic(bBall)) {
        aBall.makeDead()
        bBall.makeDead()

        aBall.translate(bBall)
      }
    }
  })

  app.ticker.add(() => {
    world.step(1 / 60)

    BallManager.update();
    ground.update();
  });
}
