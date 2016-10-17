################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../src/Acquire_Channel.c \
../src/Acquire_Evt.c \
../src/Led_Loop.c \
../src/Scope_Evt.c \
../src/Set_HV.c \
../src/Set_Led.c \
../src/Set_Trigger.c \
../src/main.c \
../src/set_PMT_hv.c 

OBJS += \
./src/Acquire_Channel.o \
./src/Acquire_Evt.o \
./src/Led_Loop.o \
./src/Scope_Evt.o \
./src/Set_HV.o \
./src/Set_Led.o \
./src/Set_Trigger.o \
./src/main.o \
./src/set_PMT_hv.o 

C_DEPS += \
./src/Acquire_Channel.d \
./src/Acquire_Evt.d \
./src/Led_Loop.d \
./src/Scope_Evt.d \
./src/Set_HV.d \
./src/Set_Led.d \
./src/Set_Trigger.d \
./src/main.d \
./src/set_PMT_hv.d 


# Each subdirectory must supply rules for building sources it contributes
src/%.o: ../src/%.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM Linux gcc compiler'
	arm-xilinx-linux-gnueabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


