
#include <configs/platform-auto.h>

#undef CONFIG_SF_DEFAULT_SPEED
#define CONFIG_SF_DEFAULT_SPEED (XILINX_PS7_QSPI_CLK_FREQ_HZ / 8)

#define CONFIG_CMD_UBI
#define CONFIG_CMD_UBIFS
#define CONFIG_RBTREE
#define CONFIG_MTD_DEVICE
#define CONFIG_MTD_PARTITIONS
#define CONFIG_SPI_FLASH_MTD
#define CONFIG_CMD_MTDPARTS
#define CONFIG_LZO

#define CONFIG_ZYNQ_USB

#define CONFIG_SYS_MALLOC_LEN 4*1024*1024

#define CONFIG_ENV_SIZE 0x2000
#define CONFIG_ENV_IS_IN_UBI
#define CONFIG_ENV_UBI_PART "qspi-ubi-itb"
#define CONFIG_ENV_UBI_VOLUME "u-boot-env1"
#define CONFIG_ENV_UBI_VOLUME_REDUND "u-boot-env2"

#define MTDIDS_DEFAULT "nor0=zynq_sf.0"
#define MTDPARTS_DEFAULT "mtdparts=zynq_sf.0:2m(qspi-fsbl-uboot),24m(qspi-ubi-itb),102m(qspi-ubi-rootfs)"

#define CONFIG_DISPLAY_BOARDINFO

#undef  CONSOLE_ARG
#define CONSOLE_ARG	"console=console=ttyPS1,9600\0"
#define PSSERIAL1	"psserial1=setenv stdout ttyPS1;setenv stdin ttyPS1\0"

/* Extra U-Boot Env settings */
#undef CONFIG_EXTRA_ENV_SETTINGS
#define CONFIG_EXTRA_ENV_SETTINGS \
           SERIAL_MULTI \
             CONSOLE_ARG \
             PSSERIAL0 \
             PSSERIAL1 \
             "nc=setenv stdout nc;setenv stdin nc;\0" \
             "autoload=no\0" \
             "clobstart=0x01000000\0" \
             "netstart=0x01000000\0" \
             "dtbnetstart=0x02800000\0" \
             "loadaddr=0x01000000\0" \
             "bootsize=0x800000\0" \
             "bootstart=0x0\0" \
             "boot_img=BOOT.BIN\0" \
             "load_boot=tftp ${clobstart} ${boot_img}\0" \
             "update_boot=setenv img boot; setenv psize ${bootsize}; setenv installcmd \"install_boot\"; run load_boot test_img; setenv img; setenv psize; setenv installcmd\0" \
             "install_boot=sf probe 0 && sf erase ${bootstart} ${bootsize} && " \
                     "sf write ${clobstart} ${bootstart} ${filesize}\0" \
             "dtb_img=system.dtb\0" \
             "load_dtb=tftp ${clobstart} ${dtb_img}\0" \
             "update_dtb=setenv img dtb; setenv psize ${dtbsize}; setenv installcmd \"install_dtb\"; run load_dtb test_img; setenv img; setenv psize; setenv installcmd\0" \
             "fault=echo ${img} image size is greater than allocated place - partition ${img} is NOT UPDATED\0" \
             "test_crc=if imi ${clobstart}; then run test_img; else echo ${img} Bad CRC - ${img} is NOT UPDATED; fi\0" \
     "test_img=setenv var \"if test ${filesize} -gt ${psize}\\; then run fault\\; else run ${installcmd}\\; fi\"; run var; setenv var\0" \
     "kernel_img=image.ub\0" \
     "netboot=tftp ${netstart} ${kernel_img} && bootm\0" \
     "mtdparts=mtdparts=zynq_sf.0:2m(qspi-fsbl-uboot),24m(qspi-ubi-itb),102m(qspi-ubi-rootfs)" \
     ""
