{
  # A dev shell ONLY.
  #
  # There is deliberately no derivation for the library itself. It has no build
  # step and no dependencies: the tests run straight off the TypeScript sources
  # through Node's type stripping, so there is nothing to compile and nothing to
  # package. A `buildNpmPackage` here would exist only to produce an artefact
  # nobody consumes — this repo is a snapshot to read, not a package to depend
  # on. See the README.
  #
  # The shell exists because `npm test` needs Node >= 22.6 for
  # --experimental-strip-types, and `npm run typecheck` needs tsc. Neither is a
  # runtime dependency of the engine.
  description = "Dev shell for the OKLCH palette engine";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAll = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.nodejs_22 pkgs.typescript ];
          shellHook = ''
            echo "oklch-palette-engine"
            echo "  npm test        — 43 tests, no install required"
            echo "  npm run typecheck — needs devDependencies (npm install) or tsc from this shell"
            node --version
          '';
        };
      });
    };
}
