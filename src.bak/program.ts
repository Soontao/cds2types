/* eslint-disable prefer-const */
/* eslint-disable ts-immutable/functional-parameters */
/* eslint-disable ts-immutable/no-loop-statement */
/* eslint-disable ts-immutable/no-let */
/* eslint-disable ts-immutable/no-return-void */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable ts-immutable/no-conditional-statement */
/* eslint-disable ts-immutable/no-this */
/* eslint-disable ts-immutable/immutable-data */
/* eslint-disable ts-immutable/no-expression-statement */
/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable ts-immutable/prefer-readonly-types */
/* eslint-disable ts-immutable/no-class */
import cds from "@sap/cds";
import * as fs from "fs-extra";
import * as morph from "ts-morph";
import * as path from "path";

import { IOptions, IParsed } from "./utils/types";

import { CDSParser } from "./cds.parser";
import { ICsn } from "./utils/cds.types";
import { Namespace } from "./types/namespace";
import _ from "lodash";

/**
 * Main porgram class.
 *
 * @export
 * @class Program
 */
export class Program {
    /**
     * Blacklist of entities, types and enums that should not be generated.
     *
     * @private
     * @type {string[]}
     * @memberof Program
     */
    private readonly blacklist: string[] = [];

    /**
     * Interface prefix.
     *
     * @private
     * @type {string}
     * @memberof Program
     */
    private interfacePrefix: string = "";

    /**
     * Main method.
     *
     * @param {Command} options Parsed CLI options.
     * @memberof Program
     */
    public async run(options: IOptions): Promise<void> {
        this.interfacePrefix = options.prefix;

        const jsonObj = await this.loadCdsAndConvertToJSON(options.cds);
        const parsed = new CDSParser().parse(jsonObj as ICsn);

        if (options.json) {
            fs.writeFileSync(options.output + ".json", JSON.stringify(jsonObj));
        }

        if (fs.existsSync(options.output)) {
            fs.removeSync(options.output);
        }

        const project = new morph.Project();
        const source = project.createSourceFile(options.output);

        this.generateCode(source, parsed);
        this.writeTypes(options.output, source);
    }

    /**
     * Loads a given CDS file and parses the compiled JSON to a object.
     *
     * @private
     * @param {string} path Path to load the CDS file from.
     * @returns {Promise<any>}
     * @memberof Program
     */
    private async loadCdsAndConvertToJSON(path: string): Promise<Object> {
        const csn = await cds.load(path);
        return JSON.parse(cds.compile.to.json(csn));
    }

    /**
     * Extracts the types from a parsed service and generates the Typescript code.
     *
     * @private
     * @param {morph.SourceFile} source Source file to generate the typescript code in
     * @param {IParsed} parsed Parsed definitions, services and namespaces
     * @memberof Program
     */
    private generateCode(source: morph.SourceFile, parsed: IParsed): void {
        let namespaces: Namespace[] = [];

        if (parsed.namespaces) {
            const ns = parsed.namespaces.map(
                n => new Namespace(n.definitions, this.blacklist, this.interfacePrefix, n.name)
            );

            namespaces.push(...ns);
        }

        if (parsed.services) {
            const ns = parsed.services.map(
                s => new Namespace(s.definitions, this.blacklist, this.interfacePrefix, s.name)
            );

            namespaces.push(...ns);
        }

        if (parsed.definitions) {
            const ns = new Namespace(parsed.definitions, this.blacklist, this.interfacePrefix);

            namespaces.push(ns);
        }

        for (const namespace of namespaces) {
            const types = _.flatten(namespaces.map(n => n.getTypes()));
            namespace.generateCode(source, types);
        }
    }

    /**
     * Writes the types to disk.
     *
     * @private
     * @param {string} filepath File path to save the types at
     * @memberof Program
     */
    private writeTypes(filepath: string, source: morph.SourceFile): void {
        const dir = path.dirname(filepath);
        if (fs.existsSync(dir)) {
            source.save().then(() => console.log(`Wrote types to '${filepath}'`));
        } else {
            console.error(`Unable to write types: '${dir}' is not a valid directory`);

            process.exit(-1);
        }
    }
}
