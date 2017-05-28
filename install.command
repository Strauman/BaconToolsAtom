#!/bin/bash
THISDIR="$(dirname ${BASH_SOURCE[0]})/"
echo "Plugin will be installed in this folder (${THISDIR}bacontools)"
echo "Is this ok?[Y|n]:"
read confd
app="Y"
if [ "${confd}" == "$app" ]
then
  cd $THISDIR
  # echo $(ls)
  git clone "https://github.com/Strauman/latex-autocomplete.git"
  echo $(mv latex-autocomplete bacontools)
  cd bacontools
  echo $(ls)
  apm link .
  npm install
  apm install
  echo "Remember to restart Atom!"
else
  echo "Installation aborted"
fi
