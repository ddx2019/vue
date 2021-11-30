/* @flow */

import { baseOptions } from "./options";
import { createCompiler } from "compiler/index"; //即'src/complier/index.js'

const { compile, compileToFunctions } = createCompiler(baseOptions);

export { compile, compileToFunctions };
