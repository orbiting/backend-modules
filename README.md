**DEPRECATED**: This repository together with others has been merged into the [orbiting/backends](https://github.com/orbiting/backends) monorepo. Let's continue the journey there.

[DEPRECATED] backend modules
----------------------------

modules used in various backend projects.


## development
```
yarn install
```

note: due to this [issue](https://github.com/lerna/lerna/issues/1125), we had to remove the `postinstall` script, thus making this repo work with yarn only. If you want to use it with npm add the script again
```
"postinstall": "lerna bootstrap"
```

To develop backend-modules in combination with a consuming project, first run `yarn run link` inside here then execute `yarn run link:backend-modules` in the consuming repo.

### publish
```
yarn run commit
```
