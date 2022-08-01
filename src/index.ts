export interface Property {
  title?: string;
  type?: string | string[];
  format?: string;
  $ref?: string;
  required?: string[];
  // eslint-disable-next-line no-use-before-define
  properties?: Properties;
}

export interface Definitions {
  [name: string]: {
    description: string;
    type: string;
  };
}

export interface Properties {
  [name: string]: Property;
}

export interface Method {
  properties: Properties;
}

export interface JsonSchemaInterface {
  oneOf?: Method[];
  anyOf?: Method[];
  allOf?: Method[];
  definitions?: Definitions;
}

export interface Jsi {
  [type: string]: {
    schema: JsonSchemaInterface | Property;
    // eslint-disable-next-line no-use-before-define
    buildMethod: BuildMethod;
  };
}

// eslint-disable-next-line no-unused-vars
export type ContractFunction<T = any> = (...params: Array<any>) => Promise<T>;
export type BuildMethod = (
  // eslint-disable-next-line no-unused-vars
  required: string[],
  // eslint-disable-next-line no-unused-vars
  properties: Properties,
  // eslint-disable-next-line no-unused-vars
  definitions: Definitions
) => ContractFunction;

export function defineReadOnly<T, K extends keyof T>(
  object: T,
  name: K,
  value: T[K]
): void {
  Object.defineProperty(object, name, {
    enumerable: true,
    writable: false,
    value,
  });
}

function hasProperty(properties: Properties | undefined) {
  if (!properties) {
    return false;
  }
  const keys = Object.keys(properties);
  for (let i = 0; i < keys.length; i += 1) {
    if (properties[keys[i]].properties) {
      return true;
    }
  }
  return false;
}

function Verifier(
  name: string,
  property: Property,
  definitions: Definitions,
  param: any
) {
  if (typeof property.type === "string") {
    switch (property.type) {
      case "string":
        if (typeof param !== "string") {
          throw new Error(`${name} (${param}) is not a string.`);
        }
        break;
      case "integer":
        if (typeof param !== "number") {
          throw new Error(`${name} (${param}) is not a number.`);
        }
        break;
      default:
        {
          const ref = property.$ref;
          if (!ref) {
            throw new Error(`${name} (${param}) has no ref.`);
          }
          if (!definitions[ref.replace("#/definitions/", "")]) {
            throw new Error(`${name} (${param}) has no definition. ${ref}`);
          }
          Verifier(
            name,
            { type: definitions[ref.replace("#/definitions/", "")].type },
            definitions,
            param
          );
        }
        break;
    }
  } else if (property.type && property.type.length > 0 && param) {
    Verifier(name, { type: property.type[0] }, definitions, param);
  }
}

export class JSI {
  readonly [type: string]: any;

  constructor(jsi: Jsi, option?: "oneOf" | "anyOf" | "allOf") {
    Object.keys(jsi).forEach((dir) => {
      const hasSingle = !!(jsi[dir].schema as any).properties;
      if (hasSingle) {
        const property = jsi[dir].schema as Property;
        if (property) {
          const { properties } = property;
          if (properties) {
            this.createMethod(
              this,
              dir,
              property.required || [],
              properties,
              {},
              jsi[dir].buildMethod
            );
          }
        }
      } else {
        if (!this[dir]) {
          defineReadOnly(this, dir, {} as any);
        }
        const schema = jsi[dir].schema as JsonSchemaInterface;
        if (schema) {
          const methods = schema[option || "anyOf"];
          if (methods) {
            methods.forEach((method) => {
              Object.keys(method.properties).forEach((name) => {
                const { properties } = method.properties[name];
                if (properties) {
                  this.createMethod(
                    this[dir],
                    name,
                    method.properties[name].required || [],
                    properties,
                    schema.definitions || {},
                    jsi[dir].buildMethod
                  );
                }
              });
            });
          }
        }
      }
    });
  }

  private createMethod(
    root: Object,
    dir: string,
    required: string[],
    properties: Properties | undefined,
    definitions: Definitions,
    fnc: BuildMethod
  ) {
    if (properties) {
      Object.keys(properties).forEach((key) => {
        if (hasProperty(properties[key].properties)) {
          defineReadOnly(root as any, dir, {} as any);
          this.createMethod(
            (root as any)[dir],
            key,
            properties[key].required || [],
            properties[key].properties,
            definitions,
            fnc
          );
        } else if (!(root as any)[dir]) {
          defineReadOnly(
            root as any,
            dir,
            fnc(required, properties, definitions)
          );
        }
      });
    }
  }

  static verifyParameters(
    required: string[],
    properties: Properties,
    definitions: Definitions,
    params: any[]
  ) {
    if (params.length < required.length) {
      throw new Error(
        `input params (${params}) error: it need ${required.length} params.`
      );
    }
    params.forEach((param, index) => {
      const key = Object.keys(properties)[index];
      Verifier(key, properties[key], definitions, param);
    });
  }
}
