/*
 * Scope_Evt.c
 *
 *  Created on: 18/lug/2016
 *      Author: D. Martello
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <time.h>
extern void *pt[5]; //memory access to the FADC
int scope_evt(unsigned *page_offset) {
	int nbin = 4096;
    int i,j;
	FILE *fp;
	int  ADC0A[5], ADC0B[5];
	fp = fopen ("/srv/www/adc_data.json", "w" );
	for(i=0;i<5;i++)
 	  	  fprintf(fp,"[");
  	  	  for(j=0; j<nbin; j++)  //
  	  	  {
  	  		  fprintf(fp,"{");
  	  		  for (i =0; i<5; i++){
  				  ADC0A[i] = *((unsigned *)(pt[i] + (*page_offset)));
  				  ADC0B[i] =ADC0A[i]&0x1fff;
  	  			  fprintf  (fp,"\"adc%d\": \"%d\"",i*2, (ADC0A[i]>>16)&0x1fff);
  	  			  fprintf(fp,", \"adc%d\": \"%d\"",i*2+1, ADC0B[i]);
  	  			  if (i != 4) {fprintf(fp,", ");}
  	  		  }
  			  (*page_offset)=((*page_offset)+4)&0x3ffc;
  	  		  fprintf(fp,"}");
  	  		  if (j!=nbin-1)  fprintf(fp,", ");
  	  	  }
  	    fprintf(fp,"]");
  	    fclose(fp);
        return 0;
}


