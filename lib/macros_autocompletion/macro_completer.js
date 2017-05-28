"use strict"
var fs = require('fs')
var path = require('path')
const lu = require('../utilities/latex_utilities')
const escape_regex = require('escape-regexp')
const provider = {
    selector: '.tex',
    // disableForSelector: '',

    // This will take priority over the default provider, which has a priority of 0.
    // `excludeLowerPriority` will suppress any providers with a lower priority
    // i.e. The default provider will be suppressed
    inclusionPriority: 1,

    // Required: Return a promise, an array of suggestions, or null.
    // request = {editor, bufferPosition, scopeDescriptor, prefix, activatedManually}
    // TODO: Please give us destructured function call already !
    getSuggestions: function (request) {
      // const comments_file_path=atom.project.getPaths()[0]+"/lib/commands.tex"
      const root_path=atom.project.getPaths()[0]
      const comments_file_paths=atom.config.get('BaconTools.commandFiles').split(",")
        // if(!fs.existsSync(comments_file_path)){
        //   return null
        // }
        var comments_text=""
        const prefix_match = this.getPrefix(request.editor, request.bufferPosition)
        if (!prefix_match){
            return null
        }

        const [prefix, macro_name_prefix, obrace] = prefix_match
        for (let cfile in comments_file_paths){
          var comfile=comments_file_paths[cfile]//.toString().trim()
          if(typeof(comfile)!="string"){
            continue
          }
          comfile=comfile.trim()
          var fullcompath=path.join(root_path,comfile)
          if(fs.existsSync(fullcompath)){
            console.log("Adding file:",fullcompath)
            comments_text+=fs.readFileSync(fullcompath,{ encoding: 'utf8' })
          }
        }
        // const comments_text=request.editor.getBuffer().getText()
        // const comments_text=fs.readFileSync(comments_file_path,{ encoding: 'utf8' })
        // const matching_macros = find_macros(lu.strip_comments(comments_text), escape_regex(macro_name_prefix))
        const matching_macros = find_macros(comments_text, escape_regex(macro_name_prefix))
        // console.log(matching_macros)

        if (!matching_macros){
            return null
        }

        const suggestions = matching_macros.map((m) => {
            return {
                snippet: snippet_from_macro_desc(m['mac']),
                replacementPrefix: prefix,
                rightLabel:m['rlabel']
            }
        })
        return suggestions
    },

    getPrefix: function (editor, bufferPosition) {
        // FIXME: Document this!
        // Get the text for the line up to the triggered buffer position
        const line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition])
        const pref = line.match(/(\\\w+)({)?$/)
        if (!pref){
            return false
        }
        return pref
    }
}

const find_macros = function(latex, prefix){
    //  Old regex below
    // const re = RegExp(String.raw`\\newcommand\*?{(${prefix}[^}]*)}(?:\[(\d)](?:\[([^\]]*)\])?)?`, 'g')
    // START NEWSTUFF \\
    const docstring_regx=String.raw`(?:.*?(%([^%]+)%)?$)?`
    const newcommand_regx = String.raw`\\newcommand\*?{(${prefix}[^}]*)}(?:\[(\d)])`+docstring_regx
    // \newcommand*{\pref.}[num]
    // const newcommand_regx = String.raw`(?:%%)?\\newcommand\*?{(${prefix}[^}]*)}(?:\[(\d)](?:\[([^\]]*)\])?)?`//+docstring_regx
    const def_regx=String.raw`\\def(${prefix}[a-zA-Z]+).*?(\d)?[\\{]`+docstring_regx
    // letMatch=re.findall(r"^(?:%%)?\\let(\\[a-zA-Z_]+)\s?=\s?(?:\{)?([^\}\n]+)",src_content, flags=re.M)
    // const re=RegExp(String.raw`(?:${newcommand_regx}|${def_regx})`, 'g')
    const re=RegExp(def_regx, 'gm')
    // console.log(re.exec(latex),newcommand_regx)
    const result = []
    // m[1]: command
    // m[2]: numargs
    // m[3]:
    for (let m = re.exec(latex); m!== null; m = re.exec(latex)) {
        // console.log(m)
        if(m[3]===undefined){
          m[3]="Nope"
        }
        if(m[4]===undefined){
          m[4]="Nope"
        }
        const rlabel=m[4]
        const nargs = parseInt(m[2])
        if (Number.isNaN(nargs)){
            // Macro without argument
            // console.log("non",m[1])
            result.push({mac:[m[1], []], rlabel:rlabel})
        } else if (m[3] !== undefined && false) {
            // Macro with an optional first argument
            // console.log("opti", m[1])
            result.push({mac:[m[1], [[true, m[3]], ...Array(nargs-1).fill([false, undefined])]], rlabel:rlabel})
        } else {
            // Macro with only mandatory arguments
            // console.log("mand:", m[1])
            result.push({mac:[m[1], Array(nargs).fill([false, undefined])], rlabel:rlabel})
        }
    }
    return result
}

const snippet_from_macro_desc = function(macro_desc){
    const argsline = macro_desc[1].map((arg, index) => {
        if (arg[0]){
            if (arg[1] === undefined){
                return `[\${${index+1}:#${index+1}}]`
            }
            return `[\${${index+1}:#${index+1} (default: '${arg[1]}')}]`
        }
        return `{\${${index+1}:#${index+1}}}`
    })
    const snippet = macro_desc[0] + argsline.join('')
    // Due to [snippet idiosyncrasies](https://github.com/atom/snippets/issues/127),
    // don't forget to double our backslashes.

    // console.log(snippet)
    return snippet.replace('\\', '\\\\')
}

module.exports = {
    provider,
    find_macros,
    snippet_from_macro_desc
}
