/*
 * Set_Led.c
 *
 *  Created on: 07/lug/2016
 *      Author: D. Martello
 */
#include <fcntl.h>
#include <stdio.h>
#include <linux/i2c-dev.h>
#include <unistd.h>
#include <sys/mman.h>
#include <stdlib.h>
int file;
#include "ssd_test_code.h"

int set_led(int dac_led1, int dac_led2, int dac_led3, int dac_led4)
{
	printf("LED values %d  %d  %d  %d.....",dac_led1,dac_led2,dac_led3,dac_led4);

	int file;
	char buf[]={0x02,0x73,0x50};
	char filename[20];

	snprintf(filename, 19, "/dev/i2c-0");
	file = open(filename, O_RDWR);
	if (file < 0) {
			printf("no open file");
			exit(1);
	}
	if (ioctl(file, I2C_SLAVE, DAC_ADDR) < 0) {
			printf("Fail to setup slave addr!");
			exit(1);
	}
    // Preparo i byte da inviare in buf
     // calcolo canale 1
     	buf[0] = 0x01;	//Seleziono canale del DAC
     	buf[1] = (dac_led1/64) + 112; //primi 4 bit piu' significativi di val trasferiti nei meno 4 significativi di a e aggiungo ctrl_reg=112
     	buf[2] = (dac_led1 & 0x3F)*4;
    	if (write(file, buf, sizeof(buf)) != sizeof(buf)) {
        	 	exit(3);
         	}
     	usleep(500);
     // calcolo canale 2
     	buf[0] = 0x02;	//Seleziono canale del DAC
     	buf[1] = (dac_led2/64) + 112; //primi 4 bit piu' significativi di val trasferiti nei meno 4 significativi di a e aggiungo ctrl_reg=112
     	buf[2] = (dac_led2 & 0x3F)*4;
     	if (write(file, buf, sizeof(buf)) != sizeof(buf)) {
     	       exit(3);
     	}
     	usleep(500);
     // calcolo canale 3
     	buf[0] = 0x04;	//Seleziono canale del DAC
     	buf[1] = (dac_led3/64) + 112; //primi 4 bit piu' significativi di val trasferiti nei meno 4 significativi di a e aggiungo ctrl_reg=112
     	buf[2] = (dac_led3 & 0x3F)*4;
     	if (write(file, buf, sizeof(buf)) != sizeof(buf)) {
     	       exit(3);
     	}
     	usleep(500);
     // calcolo canale 4
     	buf[0] = 0x08;	//Seleziono canale del DAC
     	buf[1] = (dac_led4/64) + 112; //primi 4 bit piu' significativi di val trasferiti nei meno 4 significativi di a e aggiungo ctrl_reg=112
     	buf[2] = (dac_led4 & 0x3F)*4;
     	if (write(file, buf, sizeof(buf)) != sizeof(buf)) {
     	    exit(3);
     	}
     	printf("Done!\n");
        return 0;
}

