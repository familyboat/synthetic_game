import { Graphics, type Container, type Rectangle } from "pixi.js";
import { randomChoice, toPhysics, toRender } from "./utils";
import { nanoid } from "nanoid";
import {
  b2Body_GetPosition,
  b2Body_SetType,
  b2BodyId,
  b2BodyType,
  b2Circle,
  b2CreateBody,
  b2CreateCircleShape,
  b2DefaultBodyDef,
  b2DefaultFilter,
  b2DefaultShapeDef,
  b2DestroyBody,
  b2Shape_SetFilter,
  b2Shape_SetUserData,
  b2ShapeId,
  b2Vec2,
  type b2WorldId,
} from "phaser-box2d";

declare module "phaser-box2d" {
  interface b2ShapeId {
    data?: {
      uuid: string;
      isBall: true;
    };
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
  private world: b2WorldId;
  private parent: Container;
  private xInRender: number;
  private yInRender: number;
  private ballRigidBody: b2BodyId | null = null;
  private ball: Graphics | null = null;
  private ballCollider: b2ShapeId | null = null;
  private ballLevel: BallLevel;
  private status: "active" | "dead" | "removed" = "active";

  get isActive() {
    return this.status === "active";
  }

  get data() {
    return this.ballCollider?.data;
  }

  constructor(
    world: b2WorldId,
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
    const bodyDef = b2DefaultBodyDef();
    bodyDef.type = b2BodyType.b2_dynamicBody;
    bodyDef.position = new b2Vec2(
      toPhysics(this.xInRender),
      toPhysics(this.yInRender),
    );
    bodyDef.linearDamping = 0.5;
    bodyDef.isBullet = true;
    const bodyId = b2CreateBody(this.world, bodyDef);
    this.ballRigidBody = bodyId;

    const shapeDef = b2DefaultShapeDef();
    shapeDef.density = 1;
    shapeDef.friction = 0;
    shapeDef.restitution = 0;
    shapeDef.filter.categoryBits = Ball.activeCollisionGroups;
    shapeDef.filter.maskBits = Ball.activeCollisionGroups;
    const shapeId = b2CreateCircleShape(
      bodyId,
      shapeDef,
      new b2Circle(new b2Vec2(0, 0), toPhysics(this.radiusInRender)),
    );
    this.ballCollider = shapeId;

    const uuid = nanoid();

    const data = {
      uuid,
      isBall: true,
    } as BallUserData;

    b2Shape_SetUserData(shapeId, data);
    this.ballCollider.data = data;
  }

  update() {
    console.assert(
      this.ballRigidBody !== null &&
        this.ball !== null &&
        this.status !== "removed",
    );
    if (this.ballRigidBody && this.ball) {
      const posInPhysics = b2Body_GetPosition(this.ballRigidBody);

      this.xInRender = toRender(posInPhysics.x);
      this.yInRender = toRender(posInPhysics.y);
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
      // phaser-box2d 的类型申明是错误的
      // @ts-ignore
      b2Body_SetType(this.ballRigidBody, b2BodyType.b2_kinematicBody);
      const filter = b2DefaultFilter();
      filter.categoryBits = Ball.deadCollisionGroups;
      filter.maskBits = Ball.activeCollisionGroups;
      b2Shape_SetFilter(this.ballCollider, filter);
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
      const aPos = b2Body_GetPosition(this.ballRigidBody);
      const bPos = b2Body_GetPosition(other.ballRigidBody);
      const cPos = new b2Vec2((aPos.x + bPos.x) / 2, (aPos.y + bPos.y) / 2);
      this.remove();
      BallManager.removeBall(this);
      other.remove();
      BallManager.removeBall(other);
      BallManager.syntheticNewBall(
        this.world,
        this.parent,
        (this.ballLevel + 1) as BallLevel,
        cPos,
      );
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
      b2DestroyBody(this.ballRigidBody);
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

  static makeNewBall(screen: Rectangle, world: b2WorldId, parent: Container) {
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
    world: b2WorldId,
    parent: Container,
    level: BallLevel,
    pos: b2Vec2,
  ) {
    const newBall = new Ball(
      world,
      parent,
      level,
      toRender(pos.x),
      toRender(pos.y),
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
