/*
 * Copyright (c) 2012 Xilinx, Inc.  All rights reserved.
 *
 * Xilinx, Inc.
 * XILINX IS PROVIDING THIS DESIGN, CODE, OR INFORMATION "AS IS" AS A
 * COURTESY TO YOU.  BY PROVIDING THIS DESIGN, CODE, OR INFORMATION AS
 * ONE POSSIBLE   IMPLEMENTATION OF THIS FEATURE, APPLICATION OR
 * STANDARD, XILINX IS MAKING NO REPRESENTATION THAT THIS IMPLEMENTATION
 * IS FREE FROM ANY CLAIMS OF INFRINGEMENT, AND YOU ARE RESPONSIBLE
 * FOR OBTAINING ANY RIGHTS YOU MAY REQUIRE FOR YOUR IMPLEMENTATION.
 * XILINX EXPRESSLY DISCLAIMS ANY WARRANTY WHATSOEVER WITH RESPECT TO
 * THE ADEQUACY OF THE IMPLEMENTATION, INCLUDING BUT NOT LIMITED TO
 * ANY WARRANTIES OR REPRESENTATIONS THAT THIS IMPLEMENTATION IS FREE
 * FROM CLAIMS OF INFRINGEMENT, IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE.
 *
 */
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include "sde_sc.h"
#define SC_ADDR		0x0f
char buf[160];
static const char *optString = "p:v:?";
int set_PMT_hv (int chan, int value)
{
	    int file;
	    char filename[20];
	    char reg[4] ={0x05, 0x00, 0x0, 0x0};
	    static char ch_msk[6] = {0x00, 0x20, 0x60, 0x30, 0x40, 0x50};
		value=value*1.92; // CAEN HV PMT has to be PMT 4 and 5
//		value=value*4.05;  // SD "standard" PMT  has to be PMT 1-3
		// WARNING! PMT 6 not defined
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
			fclose(file);
		 } else {
			 printf ( "invalid value %d %d\n", chan+1, value);
			 return 1;
		 }
	 return 0;


}
void display_usage( char *s )
{
    puts( "Usage:" );
    printf ( "%s  [-p PMT (1-5) # -v HV Value (0-1500)]\n", s);
    puts ("Options:");
    puts ("-p");
    puts ("-v \t -p -v are used to set the high voltage for PMT1-6 P_ARG=(1-5) ");
    puts ("   \t to value V (0-1500)");
    exit( 1 );
}

int main( int argc, char *argv[] )
{
    int opt = 0;
	int ch, val;
	opt = getopt( argc, argv, optString );
	while( opt != -1 ) {
	         switch( opt ) {
	             case 'p': // pmt 1-6
	            	 printf(" opt p val %s\n",optarg);
	            	 ch = (int) strtol (optarg,NULL, 0);
	            	 break;
	             case 'v': // voltage 0-4095
	            	 printf(" opt v val %s\n",optarg);
	            	 val = (int) strtol (optarg,NULL, 0);

	            	 set_PMT_hv (ch, val);
	            	 break;
	             case '?':
	                 display_usage(argv[0]);
	                 break;
	             default:
	                 /* You won't actually get here. */
	                 break;
	         }

	         opt = getopt( argc, argv, optString );
	}
    return 0;
}

