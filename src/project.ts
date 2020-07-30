
import * as uuid from 'uuid';
import * as ts from 'ts-morph';
import * as fs from 'fs'

export interface ProjectDefinition {
    type: 'file' | 'memory'
    uuid?: string
    name: string
    filesystem?: {
        out_dir: string;
        data_dir: string;
        root_dir: string;
        dep_dir: string;
    };
    deps?: ProjectFileDefinition[];
}
export function ProjectDefinition(config: ProjectDefinition): ProjectDefinition {
    return {
      uuid: config.uuid ?? `UUID-${uuid.v4()}`,
      type: config.type,
      name: config.name,
      filesystem: config.filesystem,
      deps: config.deps ?? [],
    }
  }
export interface ProjectFileDefinition {
    path: string
    contents?: string;
}


export type Project = ProjectDefinition & {
    project: ts.Project
    files: ts.SourceFile[];
}

export function toProject(definition: ProjectDefinition): Project {
    const tsconfig = {
        addFilesFromTsConfig: false,
        manipulationSettings: {
            indentationText: ts.IndentationText.TwoSpaces,
            insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
        },
        compilerOptions: {
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.CommonJS,
            declaration: true,
            declarationMap: true,
            moduleResolution: ts.ModuleResolutionKind.Classic,
            esModuleInterop: true,
            inlineSources: true,
            noImplicitAny: true
        }
    }
    const project = definition.type === 'memory' ?
        new ts.Project({ ...tsconfig, useInMemoryFileSystem: true }) :
        new ts.Project(tsconfig)
    const files: ts.SourceFile[] = []
    for (const file of definition.deps) {
        files.push(createSourceFile(file, project))
    }
    return {
        ...definition,
        project,
        files
    }
}

export function fromSourceFile(file: ts.SourceFile): ProjectFileDefinition {
    return {
        path: file.getFilePath(),
        contents: file.getText()
    }
}

export function createSourceFile(definition: ProjectFileDefinition, project: ts.Project) {
    return project.createSourceFile(`${definition.path}`,
        (writer: ts.CodeBlockWriter) => {
            writer.write(definition.contents).newLine()
        },
        { overwrite: true })
}

export function createProjectCodeFile(path: string, project: Project) {
    let file = project.project.getSourceFile(path)
    if (file != null) {
        // clear the file
        file.removeText()
    } else {
        file = project.project.createSourceFile(path,
            (writer: ts.CodeBlockWriter) => {
                writer.write(`import * as lib from "./lib"`).newLine()
            },
            { overwrite: true })
    }
    return file;
}

export function toStringFile(path?: string): ProjectFileDefinition {
    return {
        path: path,
        contents: fs.readFileSync(`${path}`).toString()
    }
}
