# Prebuilt images

This directory contains the pre-built UUB FSBL, modified with the QSPI
GPIO output.

There are two copies:

* zynq_fsbl_JTAG.elf - this goes in the pre-built/images/linux directory
* zynq_fsbl.elf - this goes in the images/linux directory

NOTE: There is also a u-boot.elf in this directory. This is ONLY FOR TESTING
since the normal PetaLinux build process works fine.
