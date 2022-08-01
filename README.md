# @dsrv/jsi
jsonschema interface for smartcontract

## Example
```javascript
const { JSI } = require("@dsrv/jsi");

const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "ExecuteMsg",
  anyOf: [{
      type: "object",
      required: ["create_poll"],
      properties: {
        create_poll: {
          type: "object",
          required: ["description"],
          properties: {
            description: {
              type: "string",
            },
            end_height: {
              type: ["integer", "null"],
              format: "uint64",
              minimum: 0.0,
            },
            quorum_percentage: {
              type: ["integer", "null"],
              format: "uint8",
              minimum: 0.0,
            },
            start_height: {
              type: ["integer", "null"],
              format: "uint64",
              minimum: 0.0,
            },
          },
        },
      },
      additionalProperties: false,
    }
  ]
}

function BuildContractMethod(name, required, properties, definitions) {
  return async function (...params) {
    JSI.verifyParameters(required, properties, definitions, params);
    // Code here..
    console.log(0, name);
    console.log(1, required);
    console.log(2, properties);
    console.log(3, definitions);
    console.log(4, params);
  };
}

const jsi = new JSI({
  Execute: {
    schema: schema,
    buildMethod: BuildContractMethod,
  },
});

jsi.Execute.create_poll("description", 99999999);

```
