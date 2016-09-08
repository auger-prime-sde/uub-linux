/*
 * trigger.c
 *  FPGA easy trigger setup
 *  program to send thresholds to fpga registers and operation mode 0 = OR - 1 = AND
 *  Created on: 26/lug/2016
 *      Author: R.Assiro & D. Martello
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <string.h>
int set_trigger(int threshold1, int threshold2, int threshold3, int mode)
{
	int fd;
	int trig_tresh =  0x41220000;
	int value = 0;
	unsigned page_addr, page_offset;
	void *ptrt;
	unsigned page_size=sysconf(_SC_PAGESIZE);
    if (threshold1<0) threshold1=0;
    if (threshold1>1023) threshold1=1023;
    if (threshold2<0) threshold2=0;
    if (threshold2>1023) threshold2=1023;
    if (threshold3<0) threshold3=0;
    if (threshold3>1023) threshold3=1023;
    if (mode<0 || mode >1) {
    	mode=1;
    	printf("invalid mode parameter. AND mode forced!\n");
    }
	printf("Threshold values %d  %d  %d  - MODE = %d",threshold1,threshold2,threshold3, mode);
    value=value|(threshold1<<20);
    value=value|(threshold2<<10);
    value=value|(threshold3);
// set AND
     if (mode==1) {
        value= value | 0x40000000;
     }  else {
// set OR
        value= value & 0xbfffffff;
     }
	page_offset = 16;

	fd = open ("/dev/mem", O_RDWR);
	page_addr = (trig_tresh & (~(page_size-1)));
	page_offset = trig_tresh - page_addr;
	ptrt = mmap(NULL, page_size, PROT_READ|PROT_WRITE, MAP_SHARED, fd, page_addr);


    value= value | 0x80000000;//write values in fpga reggisters
//	value = 0b10100000000010000000001000000000;
	*((unsigned *)(ptrt + page_offset)) = value;
	usleep(1);
    value= value & 0x7fffffff;
//	value = 0b00100000000010000000001000000000;
	*((unsigned *)(ptrt + page_offset)) = value;

    printf("Setup thresholds..... Done!\n");
    return 0;

}
