/*
 * Acquire_Channel.c
 *
 *  Created on: 28/lug/2016
 *      Author: User
 */
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
extern void *pt[5];
int acquire_ch(FILE *fp1, unsigned *page_offset,int CH, int nWord) {
    int i,j;

	int ADCA,ADCB;

	for(i=0;i<5;i++){
	}
		for (i =0; i<nWord; i++) //
		{
			j=(CH-1)/5;
			ADCA = *((unsigned *)(pt[j] + (*page_offset)));
			ADCB =ADCA&0x1fff;

			if (CH%2==1)fprintf(fp1,"%4d\t",(ADCA>>16)&0x1fff);
			else fprintf(fp1,"%4d\t", ADCB);
			(*page_offset)=((*page_offset)+4)&0x3ffc;
		}
		fprintf(fp1,"\n");
		usleep(10000);
        return 0;
}



