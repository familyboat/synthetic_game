import { Graphics, type Container, type Rectangle } from "pixi.js";
import { toPhysics, toRender } from "./utils";
import {
  b2Body_GetPosition,
  b2BodyType,
  b2CreateBody,
  b2CreatePolygonShape,
  b2DefaultBodyDef,
  b2DefaultShapeDef,
  b2MakeBox,
  b2Vec2,
  type b2BodyId,
  type b2WorldId,
} from "phaser-box2d";

/**
 * 草地，长方形，静态刚体；
 * 在渲染世界的尺寸：长为屏幕长，高为 20；
 * 在渲染世界的位置：长方形的中心位于半屏幕长，全屏幕高减去半高
 */
export class Ground {
  private name = "ground";
  private widthInRender: number;
  private heightInRender: number;
  private xInRender: number;
  private yInRender: number;
  private world: b2WorldId;
  private parent: Container;
  private ground?: Container;
  private groundRigidBody?: b2BodyId;

  constructor(screen: Rectangle, world: b2WorldId, parent: Container) {
    this.widthInRender = screen.width;
    this.heightInRender = 20;
    this.xInRender = 0;
    this.yInRender = screen.height - this.heightInRender;
    this.world = world;
    this.parent = parent;
  }

  init() {
    this.initRender();
    this.initPhysics();
  }

  private initRender() {
    const ground = new Graphics();
    ground.rect(0, 0, this.widthInRender, this.heightInRender);
    ground.fill("red");
    ground.label = this.name;
    this.ground = ground;

    // 这样是无效的
    // this.updateRender()

    this.parent.addChild(ground);
    // 必须在添加到 scene graph 后，更新位置才能生效
    this.updateRender();
  }

  private updateRender() {
    this.ground?.position.set(this.xInRender, this.yInRender);
  }

  private initPhysics() {
    const bodyDef = b2DefaultBodyDef();
    bodyDef.type = b2BodyType.b2_staticBody;
    bodyDef.position = new b2Vec2(
      toPhysics(this.xInRender + this.widthInRender / 2),
      toPhysics(this.yInRender + this.heightInRender / 2),
    );
    const bodyId = b2CreateBody(this.world, bodyDef);
    this.groundRigidBody = bodyId;

    const shapeDef = b2DefaultShapeDef();
    shapeDef.density = 1;
    shapeDef.friction = 0;
    shapeDef.restitution = 0;
    b2CreatePolygonShape(
      bodyId,
      shapeDef,
      b2MakeBox(
        toPhysics(this.widthInRender / 2),
        toPhysics(this.heightInRender / 2),
      ),
    );
  }

  update() {
    if (this.groundRigidBody && this.ground) {
      const pos = b2Body_GetPosition(this.groundRigidBody);
      this.xInRender = toRender(pos.x) - this.widthInRender / 2;
      this.yInRender = toRender(pos.y) - this.heightInRender / 2;
      this.updateRender();
    }
  }
}

/**
 * 实现接口的目的之一：抽象。接口相当于是创建了一个统一的行为指南，意味着可以根据这份行为指南，对衍生于同一个接口的对象做统一处理
 */
