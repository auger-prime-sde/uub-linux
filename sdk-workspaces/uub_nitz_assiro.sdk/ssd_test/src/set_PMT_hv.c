/*
 * set_PMT_hv.c
 *
 *  Created on: 18/lug/2016
 *      Author: D. Martello
 */
#include "ssd_test_code.h"
#include "sde_sc.h"
#define SC_ADDR		0x0f
int set_PMT_hv (int chan, int value)
{
	    int file;
	    char filename[20];
	    char reg[4] ={0x05, 0x00, 0x0, 0x0};
	    static char ch_msk[6] = {0x00, 0x20, 0x60, 0x30, 0x40, 0x50};
		if (chan==4) value=value*1.92; // CAEN HV PMT slot 4
		if (chan<4) value=value*4.05;  // SD PMT
		// WARNING! PMT 5 and 6 not tuned
		chan = chan -1;
		if ( (chan >= 0 && chan <=5) &&
				(value >=0 && value <= 4095) ) {
		 reg [2] = (char) (value & 0xff);
		 reg [3] = ch_msk[chan] | (char) ((value >>8) & 0x0f);
		 printf ("DAC: 0x%.2x%.2x\n",reg[3],reg[2]);

		 printf("Initialization of I2C HV DAC... ");
		 snprintf(filename, 19, "/dev/i2c-0");
		 file = open(filename, O_RDWR);
		 if (file < 0) {
					printf("no open I2C");
					exit(1);
		 }
		 if (ioctl(file, I2C_SLAVE, SC_ADDR) < 0) {
					printf("Fail to setup slave addr!");
					exit(1);
		 }

		 if (write(file, reg, 4) != 4) {
	        	 exit(3);
	     	 	 }
	     usleep (100000);
		 } else {
			 printf ( "invalid value %d %d\n", chan+1, value);
			 return 1;
		 }
	 return 0;


}

