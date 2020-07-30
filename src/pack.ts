import MemoryFileSystem from 'memory-fs'
import path from 'path'
import webpack from 'webpack';
import { NodeVM } from 'vm2';
import * as Project from './project'

const filesystem = {
    out_dir: '.',
    root_dir: '.',
    data_dir: `.`,
    dep_dir: './src/lib'
}
const project = Project.toProject({
    type: 'memory',
    name: "base",
    filesystem,
    deps: [
        { ...Project.toStringFile(`${filesystem.dep_dir}/one.ts`), path: `/one.ts` },
        { ...Project.toStringFile(`${filesystem.dep_dir}/two.ts`), path: `/two.ts` },
    ]
})

const def = {
    path: "def.ts",
    contents:
        `
            import * as one from "one";
            import * as two from "two";
            const one_object = one.One({ value: 2.0 })
            const two_object = two.Two({ name: "two name" })
            export const variable = {
                one_object, 
                two_object
            }
            `
}

async function emitDefinition(project: Project.Project, def: Project.ProjectFileDefinition): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            const def_file = path.basename(def.path)
            if (/^[^.]+.ts$/.test(def_file)) {
                Project.createSourceFile(def, project.project);
                const memfs = new MemoryFileSystem();
                const result = project.project.emitToMemory();
                const alias = result.getFiles().reduce((ret: Record<string, string>, object) => {
                    const dir = path.dirname(object.filePath)
                    const file = path.basename(object.filePath)
                    if (/^[^.]+.js$/.exec(file) != null) {
                        memfs.mkdirpSync(dir);
                        memfs.writeFileSync(object.filePath, object.text);
                        ret[file.replace(".js", "")] = object.filePath
                    }
                    return ret;
                }, {} as Record<string, string>)
                // add the main entry point for the "application"
                memfs.writeFileSync('/main.js', `const ret = require('${def_file.replace(".ts", "")}'); callback(ret) `);
                const compiler = webpack({
                    entry: '/main.js',
                    output: { filename: 'bundle.js', path: '/' },
                    resolve: { alias }
                });
                compiler.outputFileSystem = memfs
                compiler.inputFileSystem = memfs
                compiler.run((err, stats) => {
                    if (err != null) {
                        reject(err)
                    } else {
                        const vm = new NodeVM({
                            console: 'inherit',
                            sandbox: { callback: (output: any) => resolve(output) },
                            require: { external: false },
                        });
                        // run the code calling the callback
                        vm.run(stats.compilation.assets["bundle.js"]._value);
                    }
                });
            } else {
                reject(new Error('Definition must be typescript file'))
            }
        } catch (err) {
            reject(err)
        }
    })
}

emitDefinition(project, def).then((output) => console.log(`def output:`, output))
