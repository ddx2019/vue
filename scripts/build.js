// 运行npm run build文件会执行scripts/build.js文件，即当前文件，该文件的作用也是获取rollup的打包配置，并进行打包
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const rollup = require("rollup");
const terser = require("terser");

// 若不存在dist目录，则创建dist目录
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist");
}

//1.获取构建配置（从配置文件读取配置），builds 是一个含所有环境的配置的数组对象
let builds = require("./config").getAllBuilds();
/**
 * process 对象是一个全局变量，提供有关当前 Node.js 进程的信息并对其进行控制。
 * process.argv 属性返回一个数组，这个数组包含启动 Node.js 进程时传入的命令行参数；
 * 1. 第一个元素process.argv[0]——是 process.execPath,返回启动Node.js进程的可执行文件所在的绝对路径
 * 2. 第二个元素process.argv[1]——是正在执行的 JavaScript 文件的路径
 * 3. 其余元素将是任何其他命令行参数
 * 例package.json中的：`build:ssr": “npm run build -- web-runtime-cjs,web-server-renderer”`,
 *  process.argv[2]为 "web-runtime-cjs,web-server-renderer"
 */

// 2. 通过命令行参数对配置进行过滤  filter builds via command line arg
if (process.argv[2]) {
  // 有传入命令行参数，
  const filters = process.argv[2].split(",");
  /** 检测builds这个数组中,是不是至少有一个元素满足 '条件';
   * 若是，则返回builds中的所有元素组成的数组，若不是，则返回一个空数组，并将返回值赋值给builds;
   * '条件'是：我拿到的命令行参数 是不是至少有一个在对应的配置文件数组builds中存在。
   */

  builds = builds.filter((b) => {
    // b._name访问的是 ./config.js文件夹下的genConfig中为config配置对象定义的_name属性
    return filters.some(
      (f) => b.output.file.indexOf(f) > -1 || b._name.indexOf(f) > -1
    );
  });
} else {
  /** 默认过滤掉weex构建：
   *  没有传入命令行参数的时候，如运行的是 package.json中的'npm run build'命令（ "build": "node scripts/build.js"）,
   *  则builds中不会包含有关weex的配置
   */
  // filter out weex builds by default
  builds = builds.filter((b) => {
    return b.output.file.indexOf("weex") === -1;
  });
}
// 3. 根据builds中的配置进行构建，构建出不同用途的Vue.js
build(builds);

function build(builds) {
  let built = 0;
  const total = builds.length;
  const next = () => {
    buildEntry(builds[built])
      .then(() => {
        built++;
        if (built < total) {
          next();
        }
      })
      .catch(logError);
  };

  next();
}

function buildEntry(config) {
  const output = config.output;
  const { file, banner } = output;
  const isProd = /(min|prod)\.js$/.test(file);
  return rollup
    .rollup(config)
    .then((bundle) => bundle.generate(output))
    .then(({ output: [{ code }] }) => {
      if (isProd) {
        const minified =
          (banner ? banner + "\n" : "") +
          terser.minify(code, {
            toplevel: true,
            output: {
              ascii_only: true,
            },
            compress: {
              pure_funcs: ["makeMap"],
            },
          }).code;
        return write(file, minified, true);
      } else {
        return write(file, code);
      }
    });
}

function write(dest, code, zip) {
  return new Promise((resolve, reject) => {
    function report(extra) {
      console.log(
        blue(path.relative(process.cwd(), dest)) +
          " " +
          getSize(code) +
          (extra || "")
      );
      resolve();
    }

    fs.writeFile(dest, code, (err) => {
      if (err) return reject(err);
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err);
          report(" (gzipped: " + getSize(zipped) + ")");
        });
      } else {
        report();
      }
    });
  });
}

function getSize(code) {
  return (code.length / 1024).toFixed(2) + "kb";
}

function logError(e) {
  console.log(e);
}

function blue(str) {
  return "\x1b[1m\x1b[34m" + str + "\x1b[39m\x1b[22m";
}
