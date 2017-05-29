var apen = require('atom-space-pen-views')
var fs = require('fs')
var path = require('path')
const root_path="/Users/Andreas/Sites/DJ Bacon/STA-2004"
const pages_dir="pages"
const inputs_dir="inputs"
const pages_files=["1.tex", "2.tex", "3.tex","4.tex"]
class UnimplementedView extends apen.SelectListView{
  constructor(){
    super();
    self=this
    this.implemented = []
    this.inputs = []
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
      atom.clipboard.write(`\\awaits{${item}}`)
      this.storeFocusedElement()
      this.cancel()
      this.modalPanel.hide()
  }
  implementedInFile(filepath){
    var tex=fs.readFileSync(filepath,{ encoding: 'utf8' })
    const awaits_regex=String.raw`\\awaits{([\w\.]+)(:?\.tex)?}`
    const re=RegExp(awaits_regex, 'gm')
    const result=[]
    for (let m = re.exec(tex); m!== null; m = re.exec(tex)) {
      result.push(m[1]);
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
    })
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
    this.unimplemented = this.inputs.filter(function(item) {
      return self.implemented.indexOf(item) === -1;
    });
    this.setItems(this.unimplemented)
    this.show()
  }
  cancelled(){
    this.hide()
  }
  show(){
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
