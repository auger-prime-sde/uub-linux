/*
 * Acquire_Evt.c
 *
 *  Created on: 07/lug/2016
 *      Author: D. Martello M.R.Coluccia
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <time.h>
int acquire_evt(FILE *fp1, int fd , unsigned *page_offset) {
	int nbin = 4096;
    int i,j;
	void *pt[5];
	unsigned page_size=sysconf(_SC_PAGESIZE);


	unsigned int bram[5];
	int ADC0A[5], ADC0B[5];
	bram[0] = 0x42000000;// ADC 1
	bram[1] = 0x44000000;// ADC 2
	bram[2] = 0x46000000;// ADC 3
	bram[3] = 0x48000000;// ADC 4
	bram[4] = 0x4A000000;// ADC 5

	for(i=0;i<5;i++){
		pt[i] = mmap(NULL, page_size*4, PROT_READ|PROT_WRITE, MAP_SHARED, fd, bram[i]);
	}
		for (i =0; i<nbin; i++) //
		{
			for (j=0; j<5; j++) {
				ADC0A[j] = *((unsigned *)(pt[j] + (*page_offset)));
				ADC0B[j] =ADC0A[j]&0x1fff;
				fprintf(fp1,"%4d\t",(ADC0A[j]>>16)&0x1fff);
				fprintf(fp1,"%4d\t", ADC0B[j]);
			}
			(*page_offset)=((*page_offset)+4)&0x3ffc;
		}
		usleep(10000);
        return 0;
}

