"use strict"
/* global atom */

const env_completer = require("./environment_autocompletion/env_completer.js")
const label_completer = require("./label_autocompletion/label_completer.js")
const macro_completer = require('./macros_autocompletion/macro_completer.js')
const baconfiles = require('./djbacon/files.js')
const completed_editors = new Map()
const atm = require('atom')

function complete_if_latex(editor){
    if (editor.getGrammar().name == 'LaTeX' && !completed_editors.has(editor)){
        const comp =  new env_completer.Completer(editor, atom.config.get('BaconTools.addItemToListEnvironments'))
        completed_editors.set(editor, comp)
        comp.on_destroyed = (() => completed_editors.delete(editor))
    } else if (editor.getGrammar().name != 'LaTeX' && completed_editors.has(editor)){
        completed_editors.get(editor).destroy()
    }
}
function hook_editor(editor){
    complete_if_latex(editor)

    // Give a second chance to editors on grammar change
    editor.observeGrammar((grammar) => {
        complete_if_latex(editor)
    })
}

const get_autocomplete_providers = () => {
    const res = []
    if (atom.config.get('BaconTools.autocompleteLabels')){
        res.push(label_completer.provider)
    }
    if (atom.config.get('BaconTools.autocompleteMacros')){
        res.push(macro_completer.provider)
    }else{
      console.log("Settings fucked")
    }
    return res
}

module.exports = {
    activate: function() {
        // Register environments completers
        if (atom.config.get('BaconTools.automaticallyCloseEnvironments')){
            atom.workspace.observeTextEditors(hook_editor)
        }

        // Reflect `\item` addition setting in editor already observed for environment closing
        atom.config.onDidChange('BaconTools.addItemToListEnvironments', (event) => {
            for (let editor of completed_editors.keys()){
                completed_editors.get(editor).addItemToListEnvironments = event.newValue
            }
        })

        // If the environment auto closing setting changes, either destroy all completers or register
        // new completers, depending on the new value of the setting
        atom.config.onDidChange('BaconTools.automaticallyCloseEnvironments', (event) => {
            if (event.newValue){
                atom.workspace.observeTextEditors(hook_editor)
            } else {
                for (let editor of completed_editors.keys()){
                    completed_editors.get(editor).destroy()
                }
            }
        })

        // TODO: find a way to hot-toggle label autocompletion according to `BaconTools.autocompleteLabels`
        // BaconTools findfiles nstuff
        this.UnimplementedView=new baconfiles.UnimplementedView()
        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new atm.CompositeDisposable()

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
          'bacontools:ListUnimplemented': () => baconfiles.ListUnimplemented(this.UnimplementedView)
        }));

    },
    deactivate: function() {
        for (let editor of completed_editors.keys()){
            completed_editors.get(editor).destroy()
        }
    },
    get_autocomplete_providers,
    completed_editors,
    config:{
        automaticallyCloseEnvironments:{
            type: 'boolean',
            default: true
        },
        addItemToListEnvironments:{
            title: 'Add `\\item` to list environments',
            type: 'boolean',
            default: true
        },
        autocompleteLabels:{
            type: 'boolean',
            default: true
        },
        autocompleteMacros:{
            type: 'boolean',
            default: true
        },
        addToClipboard:{
          title: "Put selected unimplemented to clipboard",
          type: "boolean",
          default: false
        },
        writeInEditor:{
          title: "Write selected unimplemented in editor",
          type: "boolean",
          default: true
        },
        commandFiles:{
          title: 'Where to look for commands, comma separated, relative to project root',
          type: 'string',
          default: '/lib/commands.tex'
        }
    }
}
