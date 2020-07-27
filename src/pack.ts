import MemoryFileSystem from 'memory-fs'
import path from 'path'
import webpack from 'webpack';
import { NodeVM } from 'vm2';

import * as Project from './project'

async function buildProject(): Promise<void> {
    const filesystem = {
        out_dir: '.',
        root_dir: '.',
        data_dir: `.`,
        dep_dir: './src/lib'
    }

    const project = Project.toProject({
        type: 'file',
        name: "base",
        filesystem: {
            out_dir: './src/seed/example/test',
            root_dir: '.',
            data_dir: `/data/example/test`,
            dep_dir: './src/interface'
        },
        deps: [
            { ...Project.toStringFile(`${filesystem.dep_dir}/one.ts`), path: `${filesystem.out_dir}/one.ts` },
            { ...Project.toStringFile(`${filesystem.dep_dir}/two.ts`), path: `${filesystem.out_dir}/two.ts` },
        ]
    })
    const source = Project.createSourceFile({
        path: "run.ts",
        contents:
            `
                import * as one from "one";
                import * as two from "two";
                export function run() {
                    const one_object = one.One({ value: 2.0 })
                    const two_object = two.Two({ name: "two name" })
                    console.log(JSON.stringify(one_object), JSON.stringify(two_object))
                }
                run()
                `
    }, project.project);

    // compile the project, emit to memory
    const result = project.project.emitToMemory();
    const memfs = new MemoryFileSystem();
    const fileObject = result.getFiles().reduce((ret: Record<string, any>, object) => {
        const dir = path.dirname(object.filePath)
        const file = path.basename(object.filePath)
        // if (/^[^.]+.js$/.exec(file) != null) {
            memfs.mkdirpSync(dir);
            memfs.writeFileSync(object.filePath, object.text);
            ret[object.filePath] = object.text
        // }
        return ret;
    }, {} as Record<string, string>)
    console.log(result.getFiles())
    const compiler = webpack({
        entry: Object.keys(fileObject),
        output: {
            filename: 'bundle.js',
            path: '/'
        },
        plugins: [
            new webpack.optimize.ModuleConcatenationPlugin(),
        ],
    });
    compiler.outputFileSystem = memfs
    compiler.inputFileSystem = memfs
    compiler.run((err, stats) => { // Stats Object
        // ...
        console.log(stats.compilation.assets["bundle.js"]._value)
        //console.log(res.toString())
        const vm = new NodeVM({
            console: 'inherit',
            require: {
                external: true,
            },
        });
        // let helper = 'var run = require("run"); run()';
        //console.log(stats.compilation.assets["bundle.js"]._value);
        vm.run(stats.compilation.assets["bundle.js"]._value, 'bundle.js');
        //console.log(run);
        // console.log(run.log);
    });
}


buildProject();