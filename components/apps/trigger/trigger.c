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

int file;
int threshold1, threshold2, threshold3, threshold4, mode;

int main(int argc, char *argv[])
{
	int fd, file,i,j, Status, data_trig;
	int trig_tresh =  0x55001000;
	int value = 0;
	unsigned page_addr, page_offset;
	void *ptrt;
	unsigned page_size=sysconf(_SC_PAGESIZE);
	if (argc == 0) {
		 threshold1 = 1000;
		 threshold3 = 1000;
		 threshold2 = 1000;
		 mode  = 0;
		 printf("Default threshold values %d  %d  %d  - MODE = %d",threshold1,threshold2,threshold3, mode);
	}
	else if (argc < 5 || argc > 6){
		usage();
	}
	else {
        for (i=1; i<4; i++ ) {
            if (atoi(argv[i])<0 || atoi(argv[i])>1023) usage();
        }
		threshold1 = atoi (argv[1]);
		threshold2 = atoi (argv[2]);
		threshold3 = atoi (argv[3]);
		mode = atoi (argv[4]);
		if (mode<0 || mode >1) usage();

	}

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

    value= value | 0x80000000;//write values in fpga registers
//	value = 0b10100000000010000000001000000000;
	printf("%x\n",value);
	*((unsigned *)(ptrt + page_offset)) = value;
	usleep(1);
    value= value & 0x7fffffff;
//	value = 0b00100000000010000000001000000000;
//	printf("%x\n",value);
	*((unsigned *)(ptrt + page_offset)) = value;

    printf("Setup thresholds..... Done!\n");
    return 0;

}

void usage(void)
{
	printf("|    THRESHOLD SETUP\n");
	printf("|    usage \n");
	printf("|    trigger ThPMT1 ThPMT2 ThPMT3 mode \n");
	printf("|       ThPMTx == threshold value, ADC counts, range 0-1023  \n");
	printf("|       mode 0 == OR, 1 == AND\n");
	printf("|    example: trigger 800 800 800 1\n");
	printf("|       set threshold for the three SD PMTs to 800 ADC counts. \n");
	printf("|       To fire all the PMT must be above threshold (AND mode)\n");

	exit(1);
}
