import { Graphics, type Container, type Rectangle } from "pixi.js";
import { randomChoice, toPhysics, toRender } from "./utils";
import gsap from "gsap";
import { nanoid } from "nanoid";
import { Body, vec2, type Vec2, type World, Circle } from "p2-es";

declare module 'p2-es' {
  interface Shape {
    data?: {
      uuid: string,
      isBall: true
    }
  }
}

const ballLevelToBallRadius = {
  1: 12,
  2: 18,
  3: 24,
  4: 30,
  5: 36,
};

type BallLevel = keyof typeof ballLevelToBallRadius;

export type BallUserData = {
  uuid: string;
  isBall: true;
};

export function randomBallLevel(): BallLevel {
  const ballLevels = Object.keys(ballLevelToBallRadius);
  return parseInt(randomChoice(ballLevels)) as BallLevel;
}

function maxBallLevel(): BallLevel {
  const ballLevels = Object.keys(ballLevelToBallRadius);
  return parseInt(ballLevels[ballLevels.length - 1]) as BallLevel;
}

export class Ball {
  private static activeCollisionGroups = 0x0001;
  private static deadCollisionGroups = 0x0002;
  private static MaxBallLevel: BallLevel = maxBallLevel();

  private name = "ball";
  private radiusInRender: (typeof ballLevelToBallRadius)[BallLevel];
  private world: World;
  private parent: Container;
  private xInRender: number;
  private yInRender: number;
  private ballRigidBody: Body | null = null;
  private ball: Graphics | null = null;
  private ballCollider: Circle | null = null;
  private ballLevel: BallLevel;
  private status: "active" | "dead" | "removed" = "active";

  get isActive() {
    return this.status === "active";
  }

  get data() {
    return this.ballCollider?.data;
  }

  constructor(
    world: World,
    parent: Container,
    level: BallLevel,
    xInRender: number,
    yInRender: number,
  ) {
    this.world = world;
    this.parent = parent;
    this.xInRender = xInRender;
    this.yInRender = yInRender;
    this.radiusInRender = ballLevelToBallRadius[level];
    this.ballLevel = level;
  }

  init() {
    this.initRender();
    this.initPhysics();
  }

  private initRender() {
    const ball = new Graphics();
    ball.circle(0, 0, this.radiusInRender);
    ball.fill("green");
    ball.label = this.name;

    this.ball = ball;

    this.parent.addChild(ball);
    this.updateInRender();
  }

  private updateInRender() {
    console.assert(this.ball !== null);
    this.ball?.position.set(this.xInRender, this.yInRender);
  }

  private initPhysics() {
    const ballShape = new Circle({
      radius: toPhysics(this.radiusInRender),
      collisionGroup: Ball.activeCollisionGroups,
      collisionMask: Ball.activeCollisionGroups,
    })
    this.ballCollider = ballShape

    const uuid = nanoid();

    const ballRigidBody = new Body({
      type: Body.DYNAMIC,
      position: [
        toPhysics(this.xInRender),
        toPhysics(this.yInRender)
      ],
      damping: 0.5,
      ccdIterations: 10
    })

    ballRigidBody.addShape(ballShape)
    this.ballRigidBody = ballRigidBody

    this.world.addBody(ballRigidBody)
    ballRigidBody.setDensity(1)

    this.ballCollider.data = {
      uuid,
      isBall: true,
    };
  }

  update() {
    console.assert(
      this.ballRigidBody !== null &&
        this.ball !== null &&
        this.status !== "removed",
    );
    if (this.ballRigidBody && this.ball) {
      const posInPhysics = this.ballRigidBody.position;
      this.xInRender = toRender(posInPhysics[0]);
      this.yInRender = toRender(posInPhysics[1]);
      this.updateInRender();
    }
  }

  /**
   * 相同等级的小球碰撞后，修改球的类型，让其不再能相互碰撞，以及可以手动控制刚体的位置
   */
  makeDead() {
    console.assert(
      this.ballCollider !== null &&
        this.ballRigidBody !== null &&
        this.isActive,
    );
    if (this.ballCollider && this.ballRigidBody) {
      this.ballCollider.collisionGroup = (Ball.deadCollisionGroups);
      this.ballRigidBody.type = Body.KINEMATIC
      this.status = "dead";
    }
  }

  /**
   * makeDead 后，让两个小球相互靠近，并在靠近结束后，执行特定的回调，
   * 将 dead 小球从物理世界中移除，从渲染世界中移除，从小球管理器中
   * 移除；并生成一个新的高一等级的小球
   */
  translate(other: Ball) {
    console.assert(
      this.ballRigidBody !== null &&
        other.ballRigidBody !== null &&
        this.status === "dead",
    );
    if (this.ballRigidBody && other.ballRigidBody) {
      const aPos = this.ballRigidBody.position;
      const bPos = other.ballRigidBody.position;
      const cPos = vec2.fromValues((aPos[0] + bPos[0]) / 2, (aPos[1] + bPos[1]) / 2);

      const { promise, resolve } = Promise.withResolvers();
      let countOfCompleted = 0;

      const self = this;
      gsap.to(bPos, {
        0: cPos[0],
        1: cPos[1],
        onUpdate() {
          other.ballRigidBody!.position = bPos;
        },
        onComplete() {
          other.remove();
          BallManager.removeBall(other);

          countOfCompleted += 1;
          if (countOfCompleted === 2) {
            resolve(true);
          }
        },
      });
      gsap.to(aPos, {
        0: cPos[0],
        1: cPos[1],
        onUpdate() {
          self.ballRigidBody!.position = aPos;
        },
        onComplete() {
          self.remove();
          BallManager.removeBall(self);
          countOfCompleted += 1;
          if (countOfCompleted === 2) {
            resolve(true);
          }
        },
      });

      promise.then(() => {
        BallManager.syntheticNewBall(
          self.world,
          self.parent,
          (self.ballLevel + 1) as BallLevel,
          aPos,
        );
      });
    }
  }

  /**
   * 判断两个小球是否可以合成一个新的小球
   */
  canSynthetic(other: Ball): boolean {
    return (
      this.ballLevel === other.ballLevel && this.ballLevel < Ball.MaxBallLevel
    );
  }

  /**
   * 从物理世界和渲染世界中移除
   */
  remove() {
    console.assert(
      this.ball !== null &&
        this.ballRigidBody !== null &&
        this.status !== "removed",
    );
    if (this.ball && this.ballRigidBody) {
      this.status = "removed";
      this.parent.removeChild(this.ball);
      this.world.removeBody(this.ballRigidBody);
    }
  }

  isMe(uuid: string): boolean {
    console.assert(this.ballCollider !== null);
    if (this.ballCollider) {
      const userData = this.data as BallUserData;
      return userData.uuid === uuid;
    }

    return false;
  }
}

/**
 * 小球管理器，
 * 负责：创建新的小球，移除特定的小球
 */
export class BallManager {
  private static balls = new Map<string, Ball>();

  static makeNewBall(screen: Rectangle, world: World, parent: Container) {
    const level = randomBallLevel();
    const newBall = new Ball(
      world,
      parent,
      level,
      (Math.random() * 0.4 + 0.3) * screen.width,
      0.1 * screen.height,
    );
    newBall.init();
    BallManager.balls.set(newBall.data!.uuid, newBall);
  }

  static syntheticNewBall(
    world: World,
    parent: Container,
    level: BallLevel,
    pos: Vec2,
  ) {
    const newBall = new Ball(
      world,
      parent,
      level,
      toRender(pos[0]),
      toRender(pos[1]),
    );
    newBall.init();
    BallManager.balls.set(newBall.data!.uuid, newBall);
  }

  static removeBall(ballToBeRemoved: Ball) {
    BallManager.balls.delete(ballToBeRemoved.data!.uuid);
  }

  static update() {
    BallManager.balls.forEach((ball) => ball.update());
  }

  static getBall(uuid: string): Ball | undefined {
    return Array.from(BallManager.balls.values()).find((ball) =>
      ball.isMe(uuid),
    );
  }
}
