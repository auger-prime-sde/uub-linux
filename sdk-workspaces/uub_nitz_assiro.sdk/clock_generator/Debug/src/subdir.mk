################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
C_SRCS += \
../src/clock_generator.c 

OBJS += \
./src/clock_generator.o 

C_DEPS += \
./src/clock_generator.d 


# Each subdirectory must supply rules for building sources it contributes
src/%.o: ../src/%.c
	@echo 'Building file: $<'
	@echo 'Invoking: ARM Linux gcc compiler'
	arm-xilinx-linux-gnueabi-gcc -Wall -O0 -g3 -c -fmessage-length=0 -MT"$@" -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


