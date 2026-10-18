# brume-firmware

Firmware OpenWrt per il **GL.iNet GL-MT2500 "Brume 2"** (variante con PHY WAN
Airoha EN8811H, profilo upstream `glinet_gl-mt2500-airoha`), con una GUI in
italiano pensata per il telefono e queste funzioni già configurate:

- **AdGuard Home → Unbound**: blocco pubblicità per tutta la casa, risoluzione
  ricorsiva con DNSSEC, senza provider DNS esterni;
- **WireGuard** (server con client e QR dalla GUI) e **NetBird**;
- **NAS**: dischi USB condivisi con Samba, oppure uno spazio sulla memoria interna;
- **banIP**, **Watchcat**, backup notturno della configurazione, statistiche,
  offload hardware (PPE) o SQM;
- GUI **Brume** (`admin/glgw`): stato con avvisi su cosa sistemare, password e
  accessi, aggiornamenti del firmware; tema "routerino".

## Release automatiche

[`.github/workflows/firmware.yml`](.github/workflows/firmware.yml) controlla
ogni giorno l'ultima OpenWrt stabile (`downloads.openwrt.org/.versions.json`).
Quando esce una versione nuova costruisce l'immagine con
[`build/build.sh`](build/build.sh) (ImageBuilder ufficiale, con i checksum
verificati tramite la firma GPG di OpenWrt) e la pubblica come release
`openwrt-<versione>`. A mano: Actions › *Firmware Brume* › *Run workflow*.

## Aggiornare il router

- **Dalla GUI:** Brume › Aggiornamenti › *Aggiorna*. Il router controlla le
  release ogni 6 ore, scarica l'immagine, verifica lo SHA-256 e la
  compatibilità, poi esegue `sysupgrade` mantenendo la configurazione.
- **A mano:** scarica `*-squashfs-sysupgrade.bin` dalla release e caricalo da
  Sistema › Backup / Aggiorna firmware con *Mantieni impostazioni*.

L'aggiornamento cancella lo spazio interno del NAS (`/opt/nas.img`) e i
pacchetti installati a mano; configurazione, AdGuard Home e NetBird restano.

## Costruire in locale

```sh
build/build.sh                          # versione in build/openwrt-version
OPENWRT_VERSION=25.12.6 build/build.sh  # oppure una versione qualsiasi
```

Servono i requisiti dell'ImageBuilder di OpenWrt, più `gpg` e `git`. L'immagine
finisce in `build/out/`.

## Prima installazione

Dal firmware GL.iNet di fabbrica serve `sysupgrade -F -n` (cambio di variante
del profilo). Se qualcosa va storto, il failsafe web di U-Boot GL.iNet
(tieni premuto reset all'accensione, poi apri http://192.168.1.1) permette di
tornare al firmware originale. Usalo a tuo rischio.
