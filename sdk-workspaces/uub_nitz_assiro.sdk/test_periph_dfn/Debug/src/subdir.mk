################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/init_ADC.c \
C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/init_xiicps_clock_generator.c \
C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/init_xiicps_slow_led.c \
C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/init_xspips_DAC.c \
C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/memorytest.c \
C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/muon_buf_utils.c \
C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/shwr_buf_utils.c \
C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/test_periph.c \
C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/trigger_test.c \
C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/xscugic_tapp_example.c 

OBJS += \
./src/init_ADC.o \
./src/init_xiicps_clock_generator.o \
./src/init_xiicps_slow_led.o \
./src/init_xspips_DAC.o \
./src/memorytest.o \
./src/muon_buf_utils.o \
./src/shwr_buf_utils.o \
./src/test_periph.o \
./src/trigger_test.o \
./src/xscugic_tapp_example.o 

C_DEPS += \
./src/init_ADC.d \
./src/init_xiicps_clock_generator.d \
./src/init_xiicps_slow_led.d \
./src/init_xspips_DAC.d \
./src/memorytest.d \
./src/muon_buf_utils.d \
./src/shwr_buf_utils.d \
./src/test_periph.d \
./src/trigger_test.d \
./src/xscugic_tapp_example.d 


# Each subdirectory must supply rules for building sources it contributes
src/init_ADC.o: C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/init_ADC.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM gcc compiler'
	arm-xilinx-eabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -I../../test_periph_dfn_bsp/ps7_cortexa9_0/include -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '

src/init_xiicps_clock_generator.o: C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/init_xiicps_clock_generator.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM gcc compiler'
	arm-xilinx-eabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -I../../test_periph_dfn_bsp/ps7_cortexa9_0/include -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '

src/init_xiicps_slow_led.o: C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/init_xiicps_slow_led.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM gcc compiler'
	arm-xilinx-eabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -I../../test_periph_dfn_bsp/ps7_cortexa9_0/include -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '

src/init_xspips_DAC.o: C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/init_xspips_DAC.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM gcc compiler'
	arm-xilinx-eabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -I../../test_periph_dfn_bsp/ps7_cortexa9_0/include -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '

src/memorytest.o: C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/memorytest.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM gcc compiler'
	arm-xilinx-eabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -I../../test_periph_dfn_bsp/ps7_cortexa9_0/include -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '

src/muon_buf_utils.o: C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/muon_buf_utils.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM gcc compiler'
	arm-xilinx-eabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -I../../test_periph_dfn_bsp/ps7_cortexa9_0/include -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '

src/shwr_buf_utils.o: C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/shwr_buf_utils.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM gcc compiler'
	arm-xilinx-eabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -I../../test_periph_dfn_bsp/ps7_cortexa9_0/include -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '

src/test_periph.o: C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/test_periph.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM gcc compiler'
	arm-xilinx-eabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -I../../test_periph_dfn_bsp/ps7_cortexa9_0/include -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '

src/trigger_test.o: C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/trigger_test.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM gcc compiler'
	arm-xilinx-eabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -I../../test_periph_dfn_bsp/ps7_cortexa9_0/include -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '

src/xscugic_tapp_example.o: C:/Xilinx/Vivado/2015.2/progetti/uub_nitz_assiro_new/src/test_periph/src/xscugic_tapp_example.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM gcc compiler'
	arm-xilinx-eabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -I../../test_periph_dfn_bsp/ps7_cortexa9_0/include -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


