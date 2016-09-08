/*
 * Set_HV.c
 *
 *  Created on: 07/lug/2016
 *      Author: User
 */
#include <fcntl.h>
#include <stdio.h>
#include <linux/i2c-dev.h>
#include <unistd.h>
#include <sys/mman.h>
#include <stdlib.h>
#define DAC_ADDR		0x10 // DAC slave address DAC LTC2637

int set_hv(int hv)
{

	printf("High Voltage value %d Volts - ",hv);


	int fd, file,i,j, Status, data_trig;
	int int_trig =  0x41200000;
	int value = 0;
	unsigned page_addr, page_offset;
	void *ptrt;
	unsigned page_size=sysconf(_SC_PAGESIZE);
	page_offset = 16;
	char buf[]={0x02,0x73,0x50};
	char filename[20];

   	printf("Initialization of I2C HV DAC... ");
	snprintf(filename, 19, "/dev/i2c-0");
	file = open(filename, O_RDWR);
	if (file < 0) {
			exit("no open I2C");
	}
	if (ioctl(file, I2C_SLAVE, DAC_ADDR) < 0) {
			exit("Fail to setup slave addr!");
	}



	hv = hv * 1.92;		//CAEN power supply
	//	hv = hv * 4.05;		//roberto power supply
	// Preparo i byte da inviare
		buf[0] = 0x3F;	//Seleziono tutti i canali del DAC e invio comando scrittura
		buf[1] = (hv/16); //primi 8 bit piu' significativi di val
		buf[2] = (hv&0xFF)*16;

     	if (write(file, buf, sizeof(buf)) != sizeof(buf)) {
     	    exit(3);
     	}
     	printf("Done!\n");
     	if (hv > 0)
     		printf("ATTENTION! High Voltage is ON...\n");

     	else
     		printf("High Voltage is OFF...\n");
     	close(file);
     	return 0;
}


