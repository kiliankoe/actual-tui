{
  lib,
  stdenv,
  cctools,
  fetchPnpmDeps,
  makeWrapper,
  nodejs_26,
  pnpm,
  pnpmConfigHook,
  python3,
  removeReferencesTo,
  srcOnly,
}:

let
  nodejs = nodejs_26;
  # node-gyp needs the headers of the node we ship, not the one running it.
  nodeSources = srcOnly nodejs;
  pythonEnv = python3.withPackages (packages: [ packages.setuptools ]);
in

stdenv.mkDerivation (finalAttrs: {
  pname = "actual-tui";
  version = "1.0.0";

  src = ./.;

  nativeBuildInputs = [
    makeWrapper
    nodejs
    pnpm
    pnpmConfigHook
    pythonEnv
    removeReferencesTo
  ]
  ++ lib.optionals stdenv.hostPlatform.isDarwin [ cctools.libtool ];

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 4;
    hash = "sha256-3dKK226OPmetc4Ajq+NxL0KocFz1rLC+sL+e+LkU7pE=";
  };

  buildPhase = ''
    runHook preBuild

    pnpm build
    pnpm prune --prod

    # pnpmConfigHook installs with --ignore-scripts and the sandbox has no
    # network for a prebuilt binary, so this addon is compiled by hand.
    pushd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
    npm run build-release --offline --nodedir="${nodeSources}"
    find build -type f -exec remove-references-to -t "${nodeSources}" {} \;
    popd

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/lib/actual-tui
    cp -R dist node_modules package.json $out/lib/actual-tui/
    makeWrapper ${lib.getExe nodejs} $out/bin/actual \
      --add-flags $out/lib/actual-tui/dist/index.js

    runHook postInstall
  '';

  meta = {
    description = "Terminal UI for Actual Budget";
    homepage = "https://github.com/kiliankoe/actual-tui";
    mainProgram = "actual";
    platforms = lib.platforms.unix;
  };
})
