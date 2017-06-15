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
      // console.log("mate")
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
            comments_text+=fs.readFileSync(fullcompath,{ encoding: 'utf8' })
          }
        }
        const matching_macros = find_macros(comments_text, escape_regex(macro_name_prefix))

        if (!matching_macros){
            return null
        }

        const suggestions = matching_macros.map((m) => {
            return {
                snippet: snippet_from_macro_desc(m),
                replacementPrefix: prefix,
                rightLabel:m['desc'] || ""
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
const first_defined = function(){
  for(let arg in arguments){
    if(arguments[arg]!==undefined){
      return arguments[arg]
    }
  }
  return false
}
const find_macros = function(latex, prefix){
    //  Old regex below
    // const re = RegExp(String.raw`\\newcommand\*?{(${prefix}[^}]*)}(?:\[(\d)](?:\[([^\]]*)\])?)?`, 'g')
    // START NEWSTUFF \\
    const args_regex=String.raw`[^%]{0,}(?:%%\(([^\)]+)\)%%)?`
    //%%(arg1,arg2...)%%
    const description_regex=String.raw`(?:%([^%]+)%$)?`
    //at end of line: %DESCRIPTION%
    const docstring_regx=args_regex+description_regex

    const newcommand_regx = String.raw`\\newcommand\*?{(${prefix}[^}]*)}`+docstring_regx
    // \newcommand*{\pref.}
    const def_regx=String.raw`\\def{?(${prefix}[a-zA-Z]{0,})}?`+docstring_regx
    //\def\pref#1{stuff}
    const let_regx=String.raw`\\let{?(${prefix}[a-zA-Z]{0,})}?(?:(?:\s+)?=(?:\s+)?)?{?(\\[a-zA-Z]{0,})}?`
    const re=RegExp(String.raw`(?:${newcommand_regx}|${def_regx}|${let_regx})`, 'gm')
    const result = []
    for (let m = re.exec(latex); m!== null; m = re.exec(latex)) {
      // Is \let-command
      var commandName,als,args,desc
      var islet=false
      if(m[7]!==undefined && m[8]!==undefined){
        commandName=m[7]
        als=m[8]
        args=false
        desc=`Alias of ${als}`
        islet=true
      }
      else{
        commandName=first_defined(m[1],m[4])
        args=first_defined(m[2],m[5])
        desc=first_defined(m[3],m[6])
      }
      result.push({command:commandName, args:args, desc:desc, islet:islet})

    }
    return result

}

const snippet_from_macro_desc = function(macro){
  if (typeof(macro['args'])!="string"){
    return macro['command']+"{\$1}\$0"
  }
  var args_arr=macro['args'].split(",")
  const argsline = args_arr.map((arg,index) =>{
    return `{\${${index+1}:${arg}}}`
  })
  const snippet=macro['command']+argsline.join('')+"\$0"
  return snippet.replace('\\', '\\\\')
}

module.exports = {
    provider,
    find_macros,
    snippet_from_macro_desc
}
