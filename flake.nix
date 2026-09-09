{
  description = "Feline (Matrix client) development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      # Note: x86_64-darwin (Intel Macs) is intentionally omitted because
      # upstream nixpkgs unstable dropped it. Intel Macs, Windows, and
      # non-Nix distros keep using the plain npm workflow (npm ci / npm start),
      # which is unchanged — this flake is purely additive and optional.
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forEachSystem = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forEachSystem (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          isLinux = pkgs.stdenv.hostPlatform.isLinux;

          # Web (Vite/React/TS) + Tauri toolchain shared by all platforms.
          # JS deps themselves come from npm (package-lock.json), so Nix only
          # provides the runtimes/compilers. Tauri's JS CLI (@tauri-apps/cli)
          # is also installed via npm, not via Nix.
          commonNative = with pkgs; [
            nodejs_26 # pinned via flake.lock; matches .node-version (26.8.1)
            rustc
            cargo
            rustfmt
            clippy
            rust-analyzer
            pkg-config
            git
          ];

          # Tauri v2 Linux system libs (WebKitGTK stack + tray + bundler deps).
          # Not needed on macOS (system WebKit/Xcode) or Windows, hence Linux-only.
          linuxLibs = with pkgs; [
            webkitgtk_4_1
            gtk3
            libsoup_3
            cairo
            pango
            harfbuzz
            atk
            gdk-pixbuf
            glib
            glib-networking
            shared-mime-info
            gsettings-desktop-schemas
            librsvg
            libayatana-appindicator
            libxkbcommon
            openssl
            dbus
            xdotool
            file
          ];
        in
        {
          default = pkgs.mkShell {
            nativeBuildInputs = commonNative;
            buildInputs = if isLinux then linuxLibs else [ pkgs.openssl ];

            shellHook =
              ''
                echo "Feline dev shell: node $(node --version 2>/dev/null), npm $(npm --version 2>/dev/null), rustc $(rustc --version 2>/dev/null)"
                echo "Run 'npm ci' then 'npm start' (web) or 'npm run tauri:dev' (desktop)."
              ''
              + pkgs.lib.optionalString isLinux ''
                export WEBKIT_DISABLE_DMABUF_RENDERER=1
                export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/"
                export GSETTINGS_SCHEMA_DIR="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}/glib-2.0/schemas:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}/glib-2.0/schemas"
                export XDG_DATA_DIRS="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS"
              '';
          };
        }
      );
    };
}
