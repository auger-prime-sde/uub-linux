ifndef PETALINUX
$(error "Error: PETALINUX environment variable not set.  Change to the root of your PetaLinux install, and source the settings.sh file")
endif

include apps.common.mk
#include Aquire_Evt.c
#include Led_Loop.c
#include Acquire_Channel.c
#include Scope_Evt.c
#include sde_sc.h
#include Set_HV.c
#include Set_Led.c
#include set_PMT_hv.c
#include Set_Trigger.c

APP = ssd_test

# Add any other object files to this list below
APP_OBJS = ssd_test.o Aquire_Evt.o Led_Loop.o Acquire_Channel.o Scope_Evt.o Set_HV.o Set_Led.o set_PMT_hv.o Set_Trigger.o


all: build install

build: $(APP)

$(APP): $(APP_OBJS)
	$(CC) $(LDFLAGS) -o $@ $(APP_OBJS) $(LDLIBS)

clean:
	-rm -f $(APP) *.elf *.gdb *.o

.PHONY: install image

install: $(APP)
	$(TARGETINST) -d $(APP) /bin/$(APP)

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
