ifndef PETALINUX
$(error "Error: PETALINUX environment variable not set.  Change to the root of your PetaLinux install, and source the settings.sh file")
endif

include apps.common.mk

PREFIX=/usr
VER=lrzsz-0.12.20

CONF_OPTS=--prefix=$(PREFIX)

ifeq ($(CONFIG_PETALINUX_MMU),y)
CONF_OPTS += --disable-static
CFLAGS+=-fPIC
else
CONF_OPTS += --disable-shared --enable-static
endif

HOST_NCPU:=1
include $(PETALINUX)/etc/build/autotools.mk

install:
	# Use $(TARGETINST) to copy data into the target
	# E.g. there is lrzsz user app in the build-install/usr/bin directory, and I want
	# to copy it into the target "/bin" directory:
	#$(TARGETINST) -d build-install/usr/bin/lrzsz /bin/lrzsz
	find "$(INSTALLDIR)/$(PREFIX)"/bin/ -type f -print0 | xargs -0 -I {} $(TARGETINST) -d {} /bin/

help:
	@echo ""
	@echo "Quick reference for various supported build targets for $(INSTANCE)."
	@echo "----------------------------------------------------"
	@echo "  clean                  clean out build objects"
	@echo "  all                    build $(INSTANCE) and install to rootfs host copy"
	@echo "  build                  build subsystem"
	@echo "  install                install built objects to rootfs host copy"
