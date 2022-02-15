if [ -z $1 ]; then
  jar="/home/${USER}/.local/share/multimc/libraries/com/mojang/minecraft/1.18.1/minecraft-1.18.1-client.jar"
else
  jar="$1"
fi
if [[ "${jar: -4}" != ".jar" ]]; then
  echo "Usage: $0 <path to minecraft-1.18.1.jar>"
  exit 1
fi
if [ ! -f "$jar" ]; then
  echo "Error: file not found"
  exit 1
fi

mkdir -p minecraft_tmp
7z x "$jar" 'data/minecraft/recipes' 'assets/minecraft/textures' -ominecraft_tmp
jq -s '.' minecraft_tmp/data/minecraft/recipes/*.json > static/recipes.json
mkdir -p static/img/minecraft
mv -n minecraft_tmp/assets/minecraft/textures/item/* minecraft_tmp/assets/minecraft/textures/block/* static/img/minecraft
rm -r minecraft_tmp
