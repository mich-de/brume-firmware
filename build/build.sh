#!/usr/bin/env bash
# Immagine OpenWrt per QUESTA unità GL-MT2500. Versione: $OPENWRT_VERSION se
# impostata (la usa GitHub Actions, .github/workflows/firmware.yml), altrimenti
# il file openwrt-version.
# PHY WAN Airoha EN8811H: sotto mainline risponde all'indirizzo MDIO 13
# (re/mainline/mdio-id-scan-openwrt.txt), quindi profilo upstream "-airoha",
# che include già driver e firmware. Il 5 visto col kernel GL non vale qui.
set -euo pipefail
cd "$(dirname "$0")"

VERSION="${OPENWRT_VERSION:-$(cat openwrt-version)}"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-rc[0-9]+)?$ ]] || { echo "versione OpenWrt non valida: $VERSION" >&2; exit 1; }
IB=openwrt-imagebuilder-$VERSION-mediatek-filogic.Linux-x86_64
# come routerino: LuCI in italiano + tema "routerino" (overlay files/, copiato invariato da ../minirouter).
# Niente luci-app-attendedsysupgrade: il server ufficiale costruirebbe un'immagine senza files/
# (GUI Brume e tema persi). Gli aggiornamenti si fanno con le immagini di questo script.
LUCI="luci luci-i18n-base-it luci-i18n-firewall-it luci-i18n-package-manager-it"
# funzioni (configurate una volta da files/etc/uci-defaults/95-glgw-features)
DNS="adguardhome unbound-daemon unbound-control luci-app-unbound luci-i18n-unbound-it"
MESH="netbird"
VPN="kmod-wireguard wireguard-tools luci-proto-wireguard qrencode"
STATS="luci-app-statistics luci-i18n-statistics-it collectd-mod-cpu collectd-mod-memory collectd-mod-load collectd-mod-thermal collectd-mod-interface collectd-mod-uptime collectd-mod-df collectd-mod-rrdtool"
NAS="block-mount kmod-usb-storage kmod-usb-storage-uas kmod-fs-ext4 kmod-fs-exfat kmod-fs-ntfs3 kmod-fs-vfat kmod-nls-utf8 kmod-nls-cp437 kmod-nls-iso8859-1 samba4-server luci-app-samba4 luci-i18n-samba4-it"
QOS="sqm-scripts luci-app-sqm luci-i18n-sqm-it kmod-sched-cake"
DIAG="ethtool-full iperf3 mmc-utils"
PROT="banip luci-app-banip luci-i18n-banip-it watchcat luci-app-watchcat luci-i18n-watchcat-it"
# make non gestisce spazi nei percorsi ("gl.inet gw"): l'ImageBuilder lavora in una cartella senza spazi
WORK="${XDG_CACHE_HOME:-$HOME/.cache}/glgw-imagebuilder"
mkdir -p "$WORK"
if [ ! -d "$WORK/$IB" ]; then
  (cd "$WORK"
   base=https://downloads.openwrt.org/releases/$VERSION/targets/mediatek/filogic
   curl -fsSL -o sha256sums "$base/sha256sums" -o sha256sums.asc "$base/sha256sums.asc"
   # firma dei checksum con le chiavi del keyring ufficiale, preso da un canale diverso dal server dei download
   rm -rf keyring && git clone -q --depth 1 https://github.com/openwrt/keyring.git keyring
   for k in keyring/gpg/*.asc; do gpg --dearmor < "$k"; done > keyring.gpg
   gpgv --keyring "$PWD/keyring.gpg" sha256sums.asc sha256sums
   curl -fL -O "$base/$IB.tar.zst"
   grep " \*$IB.tar.zst\$" sha256sums | sha256sum -c -
   tar --zstd -xf "$IB.tar.zst" && rm -rf "$IB.tar.zst" sha256sums sha256sums.asc keyring keyring.gpg)
fi

rm -rf "$WORK/out" "$WORK/files" && cp -a files "$WORK/files"
make -C "$WORK/$IB" image PROFILE=glinet_gl-mt2500-airoha PACKAGES="$LUCI $DNS $MESH $VPN $STATS $NAS $QOS $DIAG $PROT" FILES="$WORK/files" BIN_DIR="$WORK/out"
rm -rf out && cp -r "$WORK/out" out
echo "OpenWrt $VERSION"
sha256sum out/*-squashfs-sysupgrade.bin
