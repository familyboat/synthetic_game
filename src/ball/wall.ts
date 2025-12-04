import { Graphics, type Container, type Rectangle } from "pixi.js";
import { toPhysics } from "./utils";
import {
  b2BodyType,
  b2CreateBody,
  b2CreatePolygonShape,
  b2DefaultBodyDef,
  b2DefaultShapeDef,
  b2MakeBox,
  b2Vec2,
  type b2WorldId,
} from "phaser-box2d";

/**
 * 强，长方形，静态刚体；
 * 在渲染世界的尺寸：长为 20，高为屏幕高；
 * 在渲染世界的位置：待定，由外部决定
 */
export class Wall {
  private name = "wall";
  private widthInRender: number;
  private heightInRender: number;
  private xInRender: number;
  private yInRender: number;
  private world: b2WorldId;
  private parent: Container;

  constructor(
    screen: Rectangle,
    world: b2WorldId,
    parent: Container,
    xInRender: number,
    yInRender: number,
  ) {
    this.widthInRender = 20;
    this.heightInRender = screen.height;
    this.xInRender = xInRender;
    this.yInRender = yInRender;
    this.world = world;
    this.parent = parent;
  }

  init() {
    this.initRender();
    this.initPhysics();
  }

  private initRender() {
    const ground = new Graphics();
    ground.rect(
      this.xInRender,
      this.yInRender,
      this.widthInRender,
      this.heightInRender,
    );
    ground.fill("red");
    ground.label = this.name;

    this.parent.addChild(ground);
  }

  private initPhysics() {
    const bodyDef = b2DefaultBodyDef();
    bodyDef.type = b2BodyType.b2_staticBody;
    bodyDef.position = new b2Vec2(
      toPhysics(this.xInRender + this.widthInRender / 2),
      toPhysics(this.yInRender + this.heightInRender / 2),
    );
    const bodyId = b2CreateBody(this.world, bodyDef);

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
}
