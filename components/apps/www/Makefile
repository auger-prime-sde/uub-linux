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
	$(TARGETINST) httpd/index.html /srv/www
	$(TARGETINST) httpd/logo_infn.png /srv/www
	$(TARGETINST) httpd/scope.html /srv/www
	$(TARGETINST) httpd/adc_data.json /srv/www
	$(TARGETINST) httpd/images/logo_auger.jpg /srv/www/images

	$(TARGETINST) httpd/auger.css /srv/www
	$(TARGETINST) httpd/jquery.min.js /srv/www
	$(TARGETINST) httpd/jquery.flot.min.js /srv/www

	$(TARGETINST) httpd/busybox-httpd /etc/init.d	# sostituzione file errato bysybox
	$(TARGETINST) httpd/inetd.conf /etc		# sostituzione file inet.conf
	$(TARGETINST) scope /bin	#sostituisco scope compilato in SDK in quanto non funziona sotto compilazione petalinux da capire
	$(TARGETINST) acquire /bin	#sostituisco acquire compilato in SDK in quanto non funziona sotto compilazione petalinux da capire
	$(TARGETINST) ssd_test /bin	#sostituisco ssd_test compilato in SDK in quanto non funziona sotto compilazione petalinux da capire
	$(TARGETINST) mountusb /sbin	# scripth to mount usb device
	$(TARGETINST) upgrade /bin	# scripth to upgrade the system image and bitstream from server machine by tftp
#	$(TARGETINST) chmod 777 /bin/upgrade 
%.o: %.c
	$(CC) -c $(CFLAGS) -o $@ $<

help:
	@echo ""
	@echo "Quick reference for various supported build targets for $(INSTANCE)."
	@echo "----------------------------------------------------"
	@echo "  clean                  clean out build objects"
	@echo "  all                    build $(INSTANCE) and install to rootfs host copy"
	@echo "  build                  build subsystem"
	@echo "  install                install built objects to rootfs host copy"
