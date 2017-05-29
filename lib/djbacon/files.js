var apen = require('atom-space-pen-views')
var fs = require('fs')
var path = require('path')
const root_path=atom.project.getPaths()[0]
const pages_dir="pages"
const inputs_dir="inputs"
const pages_files=["1.tex", "2.tex", "3.tex","4.tex"]
class UnimplementedView extends apen.SelectListView{
  constructor(){
    super();
    self=this
    this.texteditor=null
    this.implemented = []
    this.inputs = []
    this.chosen=""
    this.unimplemented = []
    this.modalPanel = atom.workspace.addModalPanel({
      item: self,
      visible: false
    });
  }
  viewForItem(item){
    return `<li class='event'>${item}</li>`
  }
  confirmed(item){
    console.log(`${item} was selected`)
      this.chosen=`\\awaits{${item}}`
      var add_to_clipboard=atom.config.get('BaconTools.addToClipboard')
      if(add_to_clipboard){
          console.log("Putting on clipboard")
          atom.clipboard.write(this.chosen)
      }else {
        console.log("Not putting on clipboard. Setting is:", add_to_clipboard)
      }
      this.cancel()
      this.modalPanel.hide()
  }
  implementedInFile(filepath){
    var tex=fs.readFileSync(filepath,{ encoding: 'utf8' })
    const awaits_regex=String.raw`\\awaits{([\w\.]+)}`
    const re=RegExp(awaits_regex, 'gm')
    const result=[]
    for (let m = re.exec(tex); m!== null; m = re.exec(tex)) {
      // result.push(path.parse(m[1]).name);
      var fle=m[1]
      if(fle.indexOf(".tex") !== -1){
        fle=fle.substr(0, fle.lastIndexOf("."))
      }
      result.push(fle)
      // console.log(m)
    }
    return result
  }
  getInputNames(){
    const inputs_path=path.join(root_path,inputs_dir)
    return fs.readdirSync(inputs_path).map((fname)=>{
      var pFile=path.parse(fname)
      if(pFile.ext==".tex"){
        return pFile.name
      }
      return false
    }).filter((item)=>{return (item!==false)});
  }
  getImplemented(){
    const pages_paths=pages_files.map((filename)=>{
      return path.join(root_path,pages_dir,filename)
    }).filter((pagefile)=>{ return fs.existsSync(pagefile) })
    console.log(pages_paths)
    var implemented=[]
    pages_paths.forEach((filepath) =>{
      implemented=implemented.concat(this.implementedInFile(filepath))
    })
    return implemented
  }
  loadAndShow(){
    self=this
    this.implemented=this.getImplemented()
    this.inputs=self.getInputNames()
    // Get the inputs that are not in implemented
    this.unimplemented = this.inputs.filter(function(item) {
      return self.implemented.indexOf(item) === -1;
    });
    this.setItems(this.unimplemented)
    this.show()
  }
  cancelled(){
    this.hide()
    var write_in_editor=atom.config.get('BaconTools.writeInEditor')
    if(write_in_editor){
        console.log("Writing to editor")
        this.texteditor.insertText(this.chosen)
    }
    else{
      console.log("Not writing to editor. Setting is:", write_in_editor)
    }
  }
  show(){
    this.texteditor=atom.workspace.getActiveTextEditor()
    this.storeFocusedElement()
    this.modalPanel.show()
    this.focusFilterEditor()
  }
  hide(){
    this.modalPanel.hide()
  }
}
const ListUnimplemented = function(view){
 view.loadAndShow()
}

module.exports = {
  UnimplementedView:UnimplementedView,
  ListUnimplemented:ListUnimplemented
}
