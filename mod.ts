class Parser {
  lines: string[];
  mode: "constructors" | "functions" = "constructors";
  // deno-lint-ignore no-explicit-any
  constructors = new Array<any>();
  // deno-lint-ignore no-explicit-any
  functions = new Array<any>();

  constructor(tlContent: string) {
    this.lines = tlContent.toString().split("\n");
    this.parse();
  }

  parse() {
    for (let line of this.lines) {
      line = line.replace(";", "").trim();

      if (line === "" || line.indexOf("//") === 0) {
        continue;
      }

      this.parseLine(line);
    }
  }

  parseLine(line: string) {
    if (line == "---functions---") {
      this.mode = "functions";
      return;
    } else if (line == "---types--") {
      this.mode = "constructors";
      return;
    }

    if (this.mode === "constructors") {
      return this.parseConstructor(line);
    } else if (this.mode === "functions") {
      return this.parseFunction(line);
    }
  }

  parseConstructor(line: string) {
    const [left, right] = line.split("=");

    if (!left || !right) {
      return;
    }

    const body = left.trim();
    const type = right.trim();

    const [predicateWithId, ...paramsAsArray] = body.split(" ");

    const [predicate, idAsString] = predicateWithId.split("#");
    const id = parseInt(idAsString, 16);
    if (isNaN(id)) {
      return;
    }

    const isVector = predicate === "vector";

    const params = isVector ? [] : paramsAsArray.map((param) => {
      const [paramName, paramType] = param.split(":");

      return {
        name: paramName,
        type: paramType,
      };
    });

    this.constructors.push({
      id,
      predicate,
      params,
      type,
    });
  }

  parseFunction(line: string) {
    const [left, right] = line.split("=");

    if (!left || !right) {
      return;
    }

    const body = left.trim();
    const type = right.trim();

    const [predicateWithId, ...paramsAsArray] = body.split(" ");

    const [func, idAsString] = predicateWithId.split("#");
    const id = parseInt(idAsString, 16);
    if (isNaN(id)) {
      return;
    }

    const params = paramsAsArray
      .filter((param) => {
        if (param[0] === "{" && param[param.length - 1] === "}") {
          return false;
        }

        return true;
      })
      .map((param) => {
        const [paramName, paramType] = param.split(":");

        return {
          name: paramName,
          type: paramType,
        };
      });

    this.functions.push({
      id,
      func,
      params,
      type,
    });
  }

  getJS() {
    return { constructors: this.constructors, functions: this.functions };
  }

  getJSON() {
    return JSON.stringify(this.getJS());
  }
}

export function parse(tlContent: string) {
  const parser = new Parser(tlContent);
  return parser.getJS();
}
