# make file for petalinux settings - written by R.Assiro - 09 2016
ifndef PETALINUX
$(error "Error: PETALINUX environment variable not set.  Change to the root of your PetaLinux install, and source the settings.sh file")
endif
include apps.common.mk
APP = www
# Add any other object files to this list below
APP_OBJS = www.o

all: build install

build: $(APP)

$(APP): $(APP_OBJS)
	$(CC) $(LDFLAGS) -o $@ $(APP_OBJS) $(LDLIBS)

clean:
	-rm -f $(APP) *.elf *.gdb *.o

.PHONY: install image

install: $(APP)
	$(TARGETINST) -d $(APP) /bin/$(APP)

	$(TARGETINST) httpd/busybox-httpd /etc/init.d	# sostituzione file errato bysybox
	$(TARGETINST) httpd/inetd.conf /etc		# sostituzione file inet.conf
	$(TARGETINST) httpd/interfaces /etc/network	# sostituzione file interfaces
	$(TARGETINST) httpd/inittab /etc	# sostituzione file inittab per velocita' seriale kernel 115200

########## Application software ###########
	$(TARGETINST) software/scope /bin	
	$(TARGETINST) software/sensor /bin		
	$(TARGETINST) software/SiPM_control /bin
	$(TARGETINST) software/slowc /bin
	$(TARGETINST) software/led /bin
	$(TARGETINST) software/hv-measure /bin
	$(TARGETINST) software/lv-measure /bin
	$(TARGETINST) software/trigger /bin
	$(TARGETINST) software/ttag_cal /bin	# clock counter reader
	$(TARGETINST) software/adc /bin
	$(TARGETINST) software/offset /bin
	$(TARGETINST) software/yadc /bin
	$(TARGETINST) software/xadc /bin
	$(TARGETINST) software/ad5694 /bin
	$(TARGETINST) software/dac7551 /bin
	$(TARGETINST) software/power_down /bin	#cange status of ADCs power_down pin
	$(TARGETINST) software/watchd /bin	# new watchdog for UUB V2
	$(TARGETINST) software/gps_serial /bin	# gps test lines
	$(TARGETINST) software/check_network /bin	# check internet connection
	$(TARGETINST) software/fw_printenv /bin	# read uboot enviroment
	$(TARGETINST) software/fw_setenv /bin	# write uboot enviroment
	$(TARGETINST) software/fw_env.config /etc	# config uboot enviroment modifications tools
	$(TARGETINST) software/mkimage /bin
	$(TARGETINST) software/dtc /bin

############## launch script at boot #############
	$(TARGETINST) -d -p 0755 scripts/patching /etc/init.d/patching # PATCHING - sistema di patch del rootfs automatico alla partenza
	$(TARGETINST) -s /etc/init.d/patching /etc/rc5.d/S00patching

#	$(TARGETINST) -d -p 0755 scripts/checkweb /etc/init.d/checkweb # CHECKWEB  controlla se il web e' in uso per permettere riparteza DAQ 
#	$(TARGETINST) -s /etc/init.d/checkweb /etc/rc5.d/S96checkweb

	$(TARGETINST) -d -p 0755 scripts/sys_ver /etc/init.d/sys_ver # versione sistema
	$(TARGETINST) -s /etc/init.d/sys_ver /etc/rc5.d/S97sys_ver

	$(TARGETINST) -d -p 0755 scripts/rc.local /etc/init.d/rc.local # RC.LOCAL 
	$(TARGETINST) -s /etc/init.d/rc.local /etc/rc5.d/S98rc.local

############# script list #########################
	$(TARGETINST) scripts/daq /sbin			# script daq to stop and run the DAQ on UUB
	$(TARGETINST) scripts/checkweb /sbin		# script checkweb
	$(TARGETINST) scripts/ver /sbin			# script info system
	$(TARGETINST) scripts/version /sbin		# script info system
	$(TARGETINST) scripts/recovery-boot /sbin	# script recovery system from volume recovery to /boot
	$(TARGETINST) scripts/recovery-update /sbin	# script copy recovery system from volume itbs
	$(TARGETINST) scripts/mountrecovery /sbin	# script to mount mtd2 partition on system
	$(TARGETINST) scripts/umountrecovery /sbin	# script to unmount mtd2 partition on system
	$(TARGETINST) scripts/mountflash /sbin		# script to mount mtd3 partition on system
	$(TARGETINST) scripts/umountflash /sbin		# script to unmount mtd3 partition on system
	$(TARGETINST) scripts/mountboot /sbin		# script to mount mtd2 partition on system
	$(TARGETINST) scripts/umountboot /sbin		# script to unmount mtd2 partition on system
	$(TARGETINST) scripts/mountusb /sbin		# script to mount usb device
	$(TARGETINST) scripts/umountusb /sbin		# script to unmount usb device
	$(TARGETINST) scripts/uub-update /sbin	 	# script to update uub from tftp server or usb memory stick
	$(TARGETINST) scripts/tftp-update /sbin	 	# script to update the system image and bitstream from server machine by tftp
	$(TARGETINST) scripts/makeflash /sbin		# script to create /flash volume in MTD3
	$(TARGETINST) scripts/image /sbin		# sostituisce nuova immagine petalinux da mio pc
	$(TARGETINST) scripts/watchdog-log /sbin	# report del logfile watchdog
	$(TARGETINST) scripts/restart /sbin		# restart system but disable the watchdog before (reboot)
	$(TARGETINST) scripts/upgrade /sbin	 	# script to upgrade the system image and bitstream from ip number by tftp
	$(TARGETINST) scripts/version_system /etc	# text file sys version number info system
	$(TARGETINST) scripts/check-boot /sbin		# check bootarg and repair /boot


############# TEST APPLICATIONS #########################
	$(TARGETINST) test_app/get_sys_version /sbin		# get_sys_version


%.o: %.c	
	$(CC) -c $(CFLAGS) -o $@ $<

help:
	@echo ""

